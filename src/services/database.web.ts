import { createContext, createElement, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DiaryBackup, DiaryEntry, DiaryFolder } from '../types/diary';

const ENTRIES_KEY = 'mydiary_entries';
const FOLDERS_KEY = 'mydiary_folders';

export type DiaryEntryInput = {
  title: string;
  content: string;
  tags: string[];
  folderId: string | null;
};

export type DiaryFolderInput = {
  name: string;
  color: string;
  icon: string;
};

const parseTags = (value: string | null): string[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === 'string') : [];
  } catch {
    return value.split(',').map((tag) => tag.trim()).filter(Boolean);
  }
};

const normalizeImportedEntry = (value: unknown): DiaryEntry | null => {
  if (!value || typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;
  if (typeof source.id !== 'string' || !source.id.trim()) return null;

  const createdAt = typeof source.createdAt === 'string' ? source.createdAt : new Date().toISOString();
  const updatedAt = typeof source.updatedAt === 'string' ? source.updatedAt : createdAt;
  const rawTags = Array.isArray(source.tags) ? source.tags : [];

  return {
    id: source.id,
    title: typeof source.title === 'string' ? source.title : '',
    content: typeof source.content === 'string' ? source.content : '',
    folderId: typeof source.folderId === 'string' ? source.folderId : null,
    createdAt,
    updatedAt,
    tags: rawTags.filter((tag): tag is string => typeof tag === 'string'),
  };
};

const normalizeImportedFolder = (value: unknown): DiaryFolder | null => {
  if (!value || typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;
  if (typeof source.id !== 'string' || !source.id.trim()) return null;

  return {
    id: source.id,
    name: typeof source.name === 'string' ? source.name : '未命名',
    color: typeof source.color === 'string' ? source.color : '#007AFF',
    icon: typeof source.icon === 'string' ? source.icon : 'folder',
    createdAt: typeof source.createdAt === 'string' ? source.createdAt : new Date().toISOString(),
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : new Date().toISOString(),
  };
};

export const normalizeBackupPayload = (payload: unknown): { entries: DiaryEntry[]; folders: DiaryFolder[] } => {
  if (Array.isArray(payload)) {
    return {
      entries: payload.map(normalizeImportedEntry).filter((entry): entry is DiaryEntry => Boolean(entry)),
      folders: [],
    };
  }

  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    const rawEntries = Array.isArray(obj.entries) ? obj.entries : [];
    const rawFolders = Array.isArray(obj.folders) ? obj.folders : [];
    return {
      entries: rawEntries.map(normalizeImportedEntry).filter((entry): entry is DiaryEntry => Boolean(entry)),
      folders: rawFolders.map(normalizeImportedFolder).filter((folder): folder is DiaryFolder => Boolean(folder)),
    };
  }

  return { entries: [], folders: [] };
};

// Web storage helpers
const getStoredEntries = async (): Promise<DiaryEntry[]> => {
  const raw = await AsyncStorage.getItem(ENTRIES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as DiaryEntry[];
  } catch {
    return [];
  }
};

const setStoredEntries = async (entries: DiaryEntry[]) => {
  await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
};

const getStoredFolders = async (): Promise<DiaryFolder[]> => {
  const raw = await AsyncStorage.getItem(FOLDERS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as DiaryFolder[];
  } catch {
    return [];
  }
};

const setStoredFolders = async (folders: DiaryFolder[]) => {
  await AsyncStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
};

export const initDatabase = async () => {
  // No-op for web, AsyncStorage is always available
};

// ==================== Folder CRUD ====================

export const listFolders = async (): Promise<DiaryFolder[]> => {
  const folders = await getStoredFolders();
  return folders.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
};

export const getFolderById = async (id: string): Promise<DiaryFolder | undefined> => {
  const folders = await getStoredFolders();
  return folders.find((f) => f.id === id);
};

export const createFolder = async (id: string, input: DiaryFolderInput): Promise<DiaryFolder> => {
  const folders = await getStoredFolders();
  const now = new Date().toISOString();
  const folder: DiaryFolder = {
    id,
    name: input.name.trim(),
    color: input.color,
    icon: input.icon,
    createdAt: now,
    updatedAt: now,
  };
  folders.push(folder);
  await setStoredFolders(folders);
  return folder;
};

export const updateFolder = async (id: string, input: DiaryFolderInput): Promise<DiaryFolder> => {
  const folders = await getStoredFolders();
  const index = folders.findIndex((f) => f.id === id);
  if (index === -1) throw new Error(`Folder not found: ${id}`);

  folders[index] = {
    ...folders[index],
    name: input.name.trim(),
    color: input.color,
    icon: input.icon,
    updatedAt: new Date().toISOString(),
  };
  await setStoredFolders(folders);
  return folders[index];
};

export const deleteFolder = async (id: string): Promise<void> => {
  const folders = await getStoredFolders();
  await setStoredFolders(folders.filter((f) => f.id !== id));

  // Move entries out of folder
  const entries = await getStoredEntries();
  for (const entry of entries) {
    if (entry.folderId === id) entry.folderId = null;
  }
  await setStoredEntries(entries);
};

// ==================== Entry CRUD ====================

export const listEntries = async (folderId?: string | null): Promise<DiaryEntry[]> => {
  const entries = await getStoredEntries();
  let filtered = entries;
  if (folderId === null) {
    filtered = entries.filter((e) => !e.folderId);
  } else if (folderId !== undefined) {
    filtered = entries.filter((e) => e.folderId === folderId);
  }
  return filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

export const searchEntries = async (query: string, folderId?: string | null): Promise<DiaryEntry[]> => {
  const trimmedQuery = query.trim().toLowerCase();
  if (!trimmedQuery) return listEntries(folderId);

  const entries = await listEntries(folderId);
  return entries.filter(
    (e) =>
      e.title.toLowerCase().includes(trimmedQuery) ||
      e.content.toLowerCase().includes(trimmedQuery) ||
      e.tags.some((t) => t.toLowerCase().includes(trimmedQuery))
  );
};

export const getEntryById = async (id: string): Promise<DiaryEntry | undefined> => {
  const entries = await getStoredEntries();
  return entries.find((e) => e.id === id);
};

export const createEntry = async (id: string, input: DiaryEntryInput): Promise<DiaryEntry> => {
  const entries = await getStoredEntries();
  const now = new Date().toISOString();
  const entry: DiaryEntry = {
    id,
    title: input.title.trim(),
    content: input.content.trim(),
    folderId: input.folderId,
    createdAt: now,
    updatedAt: now,
    tags: input.tags,
  };
  entries.push(entry);
  await setStoredEntries(entries);
  return entry;
};

export const updateEntry = async (id: string, input: DiaryEntryInput): Promise<DiaryEntry> => {
  const entries = await getStoredEntries();
  const index = entries.findIndex((e) => e.id === id);
  if (index === -1) throw new Error(`Diary entry not found: ${id}`);

  entries[index] = {
    ...entries[index],
    title: input.title.trim(),
    content: input.content.trim(),
    folderId: input.folderId,
    tags: input.tags,
    updatedAt: new Date().toISOString(),
  };
  await setStoredEntries(entries);
  return entries[index];
};

export const deleteEntry = async (id: string): Promise<void> => {
  const entries = await getStoredEntries();
  await setStoredEntries(entries.filter((e) => e.id !== id));
};

export const deleteEntries = async (ids: string[]): Promise<void> => {
  if (ids.length === 0) return;
  const idSet = new Set(ids);
  const entries = await getStoredEntries();
  await setStoredEntries(entries.filter((e) => !idSet.has(e.id)));
};

export const moveEntriesToFolder = async (ids: string[], folderId: string | null): Promise<void> => {
  if (ids.length === 0) return;
  const idSet = new Set(ids);
  const entries = await getStoredEntries();
  const now = new Date().toISOString();
  for (const entry of entries) {
    if (idSet.has(entry.id)) {
      entry.folderId = folderId;
      entry.updatedAt = now;
    }
  }
  await setStoredEntries(entries);
};

export const exportEntries = async (): Promise<DiaryBackup> => ({
  version: 2,
  exportedAt: new Date().toISOString(),
  entries: await listEntries(),
  folders: await listFolders(),
});

export const importEntries = async (entries: DiaryEntry[], folders: DiaryFolder[]): Promise<{ added: number; updated: number; skipped: number; foldersAdded: number }> => {
  let foldersAdded = 0;

  // Import folders
  const existingFolders = await getStoredFolders();
  const existingFolderIds = new Set(existingFolders.map((f) => f.id));
  for (const folder of folders) {
    if (!existingFolderIds.has(folder.id)) {
      existingFolders.push(folder);
      foldersAdded += 1;
    }
  }
  await setStoredFolders(existingFolders);

  // Import entries
  const existingEntries = await getStoredEntries();
  const existingMap = new Map(existingEntries.map((e) => [e.id, e]));

  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const entry of entries) {
    const existing = existingMap.get(entry.id);
    if (!existing) {
      existingEntries.push(entry);
      added += 1;
      continue;
    }

    if (new Date(entry.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
      Object.assign(existing, entry);
      updated += 1;
    } else {
      skipped += 1;
    }
  }

  await setStoredEntries(existingEntries);
  return { added, updated, skipped, foldersAdded };
};

export type DatabaseApi = {
  listFolders: typeof listFolders;
  getFolderById: typeof getFolderById;
  createFolder: typeof createFolder;
  updateFolder: typeof updateFolder;
  deleteFolder: typeof deleteFolder;
  listEntries: typeof listEntries;
  searchEntries: typeof searchEntries;
  getEntryById: typeof getEntryById;
  createEntry: typeof createEntry;
  updateEntry: typeof updateEntry;
  deleteEntry: typeof deleteEntry;
  deleteEntries: typeof deleteEntries;
  moveEntriesToFolder: typeof moveEntriesToFolder;
  exportEntries: typeof exportEntries;
  importEntries: typeof importEntries;
};

const databaseApi: DatabaseApi = {
  listFolders,
  getFolderById,
  createFolder,
  updateFolder,
  deleteFolder,
  listEntries,
  searchEntries,
  getEntryById,
  createEntry,
  updateEntry,
  deleteEntry,
  deleteEntries,
  moveEntriesToFolder,
  exportEntries,
  importEntries,
};

const DatabaseContext = createContext<DatabaseApi | null>(null);

export const DatabaseProvider = ({ children }: { children: ReactNode }) => {
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    initDatabase()
      .then(() => {
        if (mounted) setIsReady(true);
      })
      .catch((error) => {
        console.error('Failed to initialize database', error);
        if (mounted) {
          setInitError(error instanceof Error ? error : new Error(String(error)));
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo(() => databaseApi, []);

  if (initError) {
    return createElement(
      View,
      { style: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 } },
      createElement(Text, { style: { color: '#b00020', textAlign: 'center' } }, `数据库初始化失败：${initError.message}`)
    );
  }

  if (!isReady) {
    return createElement(
      View,
      { style: { flex: 1, alignItems: 'center', justifyContent: 'center' } },
      createElement(Text, { style: { color: '#666' } }, '正在加载日记...')
    );
  }

  return createElement(DatabaseContext.Provider, { value }, children);
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within DatabaseProvider');
  }
  return context;
};

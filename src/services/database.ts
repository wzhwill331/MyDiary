import { createContext, createElement, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { v4 as uuidv4 } from 'uuid';
import { DiaryBackup, DiaryEntry, DiaryFolder } from '../types/diary';

const DATABASE_NAME = 'mydiary.db';

export type DiaryEntryInput = {
  title: string;
  content: string;
  tags: string[];
  folderId: string | null;
  mood?: string | null;
  imageUris?: string[];
  background?: string | null;
};

export type DiaryFolderInput = {
  name: string;
  color: string;
  icon: string;
};

type DiaryEntryRow = {
  id: string;
  title: string | null;
  content: string | null;
  folderId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  tags: string | null;
  isPinned: number | null;
  mood: string | null;
  imageUris: string | null;
  background: string | null;
};

type DiaryFolderRow = {
  id: string;
  name: string;
  color: string;
  icon: string;
  createdAt: string | null;
  updatedAt: string | null;
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

const openDatabase = async () => {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }
  return dbPromise;
};

const parseTags = (value: string | null): string[] => {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === 'string') : [];
  } catch {
    return value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
};

const serializeTags = (tags: string[]) => JSON.stringify([...new Set(tags.map((tag) => tag.trim()).filter(Boolean))]);

const rowToDiaryEntry = (row: DiaryEntryRow): DiaryEntry => ({
  id: row.id,
  title: row.title ?? '',
  content: row.content ?? '',
  folderId: row.folderId ?? null,
  createdAt: row.createdAt ?? new Date(0).toISOString(),
  updatedAt: row.updatedAt ?? row.createdAt ?? new Date(0).toISOString(),
  tags: parseTags(row.tags),
  isPinned: row.isPinned === 1,
  mood: row.mood ?? null,
  imageUris: row.imageUris ? JSON.parse(row.imageUris) : [],
  background: row.background ?? null,
});

const rowToDiaryFolder = (row: DiaryFolderRow): DiaryFolder => ({
  id: row.id,
  name: row.name,
  color: row.color,
  icon: row.icon,
  createdAt: row.createdAt ?? new Date(0).toISOString(),
  updatedAt: row.updatedAt ?? row.createdAt ?? new Date(0).toISOString(),
});

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
    // Legacy v1 backup (entries array only)
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

export const initDatabase = async () => {
  const database = await openDatabase();

  // Create folders table
  await database.execAsync(`CREATE TABLE IF NOT EXISTS diary_folders (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#007AFF',
    icon TEXT NOT NULL DEFAULT 'folder',
    createdAt TEXT,
    updatedAt TEXT
  );`);

  // Create entries table with folderId
  await database.execAsync(`CREATE TABLE IF NOT EXISTS diary_entries (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT,
    content TEXT,
    folderId TEXT,
    createdAt TEXT,
    updatedAt TEXT,
    tags TEXT,
    imageUris TEXT,
    FOREIGN KEY (folderId) REFERENCES diary_folders(id) ON DELETE SET NULL
  );`);

  // Migration: add folderId column if missing (for existing databases)
  try {
    await database.execAsync(`ALTER TABLE diary_entries ADD COLUMN folderId TEXT;`);
  } catch {
    // Column already exists, ignore
  }

  // Migration: add deletedAt column for soft delete
  try {
    await database.execAsync(`ALTER TABLE diary_entries ADD COLUMN deletedAt TEXT;`);
  } catch {
    // Column already exists, ignore
  }

  // Migration: add isPinned column
  try {
    await database.execAsync(`ALTER TABLE diary_entries ADD COLUMN isPinned INTEGER DEFAULT 0;`);
  } catch {
    // Column already exists, ignore
  }

  // Migration: add mood column
  try {
    await database.execAsync(`ALTER TABLE diary_entries ADD COLUMN mood TEXT;`);
  } catch {
    // Column already exists, ignore
  }

  // Migration: add imageUris column
  try {
    await database.execAsync(`ALTER TABLE diary_entries ADD COLUMN imageUris TEXT;`);
  } catch {
    // Column already exists, ignore
  }

  // Migration: add background column
  try {
    await database.execAsync(`ALTER TABLE diary_entries ADD COLUMN background TEXT;`);
  } catch {
    // Column already exists, ignore
  }
};

// ==================== Folder CRUD ====================

export const listFolders = async (): Promise<DiaryFolder[]> => {
  await initDatabase();
  const database = await openDatabase();
  const rows = await database.getAllAsync<DiaryFolderRow>(
    'SELECT id, name, color, icon, createdAt, updatedAt FROM diary_folders ORDER BY createdAt ASC'
  );
  return rows.map(rowToDiaryFolder);
};

export const getFolderById = async (id: string): Promise<DiaryFolder | undefined> => {
  await initDatabase();
  const database = await openDatabase();
  const row = await database.getFirstAsync<DiaryFolderRow>(
    'SELECT id, name, color, icon, createdAt, updatedAt FROM diary_folders WHERE id = ?',
    [id]
  );
  return row ? rowToDiaryFolder(row) : undefined;
};

export const createFolder = async (id: string, input: DiaryFolderInput): Promise<DiaryFolder> => {
  await initDatabase();
  const now = new Date().toISOString();
  const folder: DiaryFolder = {
    id,
    name: input.name.trim(),
    color: input.color,
    icon: input.icon,
    createdAt: now,
    updatedAt: now,
  };

  const database = await openDatabase();
  await database.runAsync(
    'INSERT INTO diary_folders (id, name, color, icon, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
    [folder.id, folder.name, folder.color, folder.icon, folder.createdAt, folder.updatedAt]
  );

  return folder;
};

export const updateFolder = async (id: string, input: DiaryFolderInput): Promise<DiaryFolder> => {
  await initDatabase();
  const existing = await getFolderById(id);
  if (!existing) {
    throw new Error(`Folder not found: ${id}`);
  }

  const folder: DiaryFolder = {
    ...existing,
    name: input.name.trim(),
    color: input.color,
    icon: input.icon,
    updatedAt: new Date().toISOString(),
  };

  const database = await openDatabase();
  await database.runAsync(
    'UPDATE diary_folders SET name = ?, color = ?, icon = ?, updatedAt = ? WHERE id = ?',
    [folder.name, folder.color, folder.icon, folder.updatedAt, folder.id]
  );

  return folder;
};

export const deleteFolder = async (id: string): Promise<void> => {
  await initDatabase();
  const database = await openDatabase();
  // Move entries out of folder before deleting
  await database.runAsync('UPDATE diary_entries SET folderId = NULL WHERE folderId = ?', [id]);
  await database.runAsync('DELETE FROM diary_folders WHERE id = ?', [id]);
};

// ==================== Entry CRUD ====================

export const listEntries = async (folderId?: string | null): Promise<DiaryEntry[]> => {
  await initDatabase();
  const database = await openDatabase();

  let query = 'SELECT id, title, content, folderId, createdAt, updatedAt, tags, isPinned, mood, imageUris, background FROM diary_entries WHERE deletedAt IS NULL';
  const params: string[] = [];

  if (folderId === null) {
    query += ' AND folderId IS NULL';
  } else if (folderId !== undefined) {
    query += ' AND folderId = ?';
    params.push(folderId);
  }

  query += ' ORDER BY isPinned DESC, updatedAt DESC, createdAt DESC';

  const rows = await database.getAllAsync<DiaryEntryRow>(query, params);
  return rows.map(rowToDiaryEntry);
};

export const searchEntries = async (query: string, folderId?: string | null): Promise<DiaryEntry[]> => {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return listEntries(folderId);

  await initDatabase();
  const database = await openDatabase();
  const likeQuery = `%${trimmedQuery}%`;

  let sql = `SELECT id, title, content, folderId, createdAt, updatedAt, tags, isPinned, mood, imageUris
     FROM diary_entries
     WHERE deletedAt IS NULL AND (title LIKE ? OR content LIKE ? OR tags LIKE ?)`;
  const params: string[] = [likeQuery, likeQuery, likeQuery];

  if (folderId === null) {
    sql += ' AND folderId IS NULL';
  } else if (folderId !== undefined) {
    sql += ' AND folderId = ?';
    params.push(folderId);
  }

  sql += ' ORDER BY isPinned DESC, updatedAt DESC, createdAt DESC';

  const rows = await database.getAllAsync<DiaryEntryRow>(sql, params);
  return rows.map(rowToDiaryEntry);
};

export const getEntryById = async (id: string): Promise<DiaryEntry | undefined> => {
  await initDatabase();
  const database = await openDatabase();
  const row = await database.getFirstAsync<DiaryEntryRow>(
    'SELECT id, title, content, folderId, createdAt, updatedAt, tags, isPinned, mood, imageUris, background FROM diary_entries WHERE id = ?',
    [id]
  );
  return row ? rowToDiaryEntry(row) : undefined;
};

export const createEntry = async (id: string, input: DiaryEntryInput): Promise<DiaryEntry> => {
  await initDatabase();
  const now = new Date().toISOString();
  const entry: DiaryEntry = {
    id,
    title: input.title.trim(),
    content: input.content.trim(),
    folderId: input.folderId,
    createdAt: now,
    updatedAt: now,
    tags: input.tags,
    mood: input.mood ?? null,
    imageUris: input.imageUris ?? [],
    background: input.background ?? null,
  };

  const database = await openDatabase();
  await database.runAsync(
    'INSERT INTO diary_entries (id, title, content, folderId, createdAt, updatedAt, tags, imageUris, mood, background) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [entry.id, entry.title, entry.content, entry.folderId, entry.createdAt, entry.updatedAt, serializeTags(entry.tags), JSON.stringify(entry.imageUris ?? []), entry.mood ?? null, entry.background ?? null]
  );

  return entry;
};

export const updateEntry = async (id: string, input: DiaryEntryInput): Promise<DiaryEntry> => {
  await initDatabase();
  const existing = await getEntryById(id);
  if (!existing) {
    throw new Error(`Diary entry not found: ${id}`);
  }

  const entry: DiaryEntry = {
    ...existing,
    title: input.title.trim(),
    content: input.content.trim(),
    folderId: input.folderId,
    tags: input.tags,
    mood: input.mood ?? existing.mood ?? null,
    imageUris: input.imageUris ?? existing.imageUris ?? [],
    background: input.background ?? existing.background ?? null,
    updatedAt: new Date().toISOString(),
  };

  const database = await openDatabase();
  await database.runAsync(
    'UPDATE diary_entries SET title = ?, content = ?, folderId = ?, updatedAt = ?, tags = ?, mood = ?, imageUris = ?, background = ? WHERE id = ?',
    [entry.title, entry.content, entry.folderId, entry.updatedAt, serializeTags(entry.tags), entry.mood ?? null, JSON.stringify(entry.imageUris ?? []), entry.background ?? null, entry.id]
  );

  return entry;
};

export const deleteEntry = async (id: string): Promise<void> => {
  await initDatabase();
  const database = await openDatabase();
  await database.runAsync('UPDATE diary_entries SET deletedAt = ? WHERE id = ?', [new Date().toISOString(), id]);
};

export const restoreEntry = async (id: string): Promise<void> => {
  await initDatabase();
  const database = await openDatabase();
  await database.runAsync('UPDATE diary_entries SET deletedAt = NULL WHERE id = ?', [id]);
};

export const permanentDeleteEntry = async (id: string): Promise<void> => {
  await initDatabase();
  const database = await openDatabase();
  await database.runAsync('DELETE FROM diary_entries WHERE id = ?', [id]);
};

export const getDiaryStats = async (): Promise<{ totalEntries: number; monthEntries: number; totalChars: number; streak: number }> => {
  await initDatabase();
  const database = await openDatabase();

  // Total entries
  const totalRow = await database.getFirstAsync<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM diary_entries WHERE deletedAt IS NULL'
  );
  const totalEntries = totalRow?.cnt ?? 0;

  // This month entries
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthRow = await database.getFirstAsync<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM diary_entries WHERE deletedAt IS NULL AND (createdAt LIKE ? OR updatedAt LIKE ?)',
    [`${monthPrefix}%`, `${monthPrefix}%`]
  );
  const monthEntries = monthRow?.cnt ?? 0;

  // Total characters
  const charsRow = await database.getFirstAsync<{ total: number }>(
    'SELECT SUM(LENGTH(content)) as total FROM diary_entries WHERE deletedAt IS NULL'
  );
  const totalChars = charsRow?.total ?? 0;

  // Streak: count consecutive days with entries (from today backwards)
  const allRows = await database.getAllAsync<{ day: string }>(
    `SELECT DISTINCT substr(createdAt, 1, 10) as day FROM diary_entries WHERE deletedAt IS NULL ORDER BY day DESC`
  );
  const days = new Set(allRows.map((r) => r.day));
  let streak = 0;
  const d = new Date();
  while (true) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (days.has(key)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }

  return { totalEntries, monthEntries, totalChars, streak };
};

export const listEntriesByDate = async (dateStr: string): Promise<DiaryEntry[]> => {
  await initDatabase();
  const database = await openDatabase();
  const rows = await database.getAllAsync<DiaryEntryRow>(
    `SELECT id, title, content, folderId, createdAt, updatedAt, tags, isPinned, mood, imageUris, background FROM diary_entries
     WHERE deletedAt IS NULL AND (createdAt LIKE ? OR updatedAt LIKE ?)
     ORDER BY updatedAt DESC`,
    [`${dateStr}%`, `${dateStr}%`]
  );
  return rows.map(rowToDiaryEntry);
};

export const listEntriesByMonthDay = async (monthDay: string): Promise<DiaryEntry[]> => {
  await initDatabase();
  const allEntries = await listEntries();
  // monthDay format: 'MM-DD'
  return allEntries.filter((e) => {
    const d = e.createdAt;
    // Match pattern like '-05-19' anywhere in the ISO date string
    return d.includes('-' + monthDay);
  });
};

// Debug: create a test entry for "on this day" feature
export const togglePinEntry = async (id: string): Promise<void> => {
  await initDatabase();
  const database = await openDatabase();
  await database.runAsync('UPDATE diary_entries SET isPinned = CASE WHEN isPinned = 1 THEN 0 ELSE 1 END WHERE id = ?', [id]);
};

export const listTrashedEntries = async (): Promise<DiaryEntry[]> => {
  await initDatabase();
  const database = await openDatabase();
  const rows = await database.getAllAsync<{ id: string; title: string | null; content: string | null; folderId: string | null; createdAt: string | null; updatedAt: string | null; tags: string | null; deletedAt: string | null; isPinned: number | null }>(
    'SELECT id, title, content, folderId, createdAt, updatedAt, tags, deletedAt, isPinned FROM diary_entries WHERE deletedAt IS NOT NULL ORDER BY deletedAt DESC'
  );
  return rows.map((row) => ({
    id: row.id,
    title: row.title ?? '',
    content: row.content ?? '',
    folderId: row.folderId ?? null,
    createdAt: row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? new Date().toISOString(),
    tags: row.tags ? JSON.parse(row.tags) : [],
    deletedAt: row.deletedAt ?? null,
    isPinned: row.isPinned === 1,
  }));
};

export const emptyTrash = async (): Promise<void> => {
  await initDatabase();
  const database = await openDatabase();
  await database.runAsync('DELETE FROM diary_entries WHERE deletedAt IS NOT NULL');
};

export const deleteEntries = async (ids: string[]): Promise<void> => {
  if (ids.length === 0) return;
  await initDatabase();
  const database = await openDatabase();
  const placeholders = ids.map(() => '?').join(', ');
  await database.runAsync(`UPDATE diary_entries SET deletedAt = ? WHERE id IN (${placeholders})`, [new Date().toISOString(), ...ids]);
};

export const moveEntriesToFolder = async (ids: string[], folderId: string | null): Promise<void> => {
  if (ids.length === 0) return;
  await initDatabase();
  const database = await openDatabase();
  const placeholders = ids.map(() => '?').join(', ');
  await database.runAsync(
    `UPDATE diary_entries SET folderId = ?, updatedAt = ? WHERE id IN (${placeholders})`,
    [folderId, new Date().toISOString(), ...ids]
  );
};

export const exportEntries = async (): Promise<DiaryBackup> => ({
  version: 2,
  exportedAt: new Date().toISOString(),
  entries: await listEntries(),
  folders: await listFolders(),
});

export const importEntries = async (entries: DiaryEntry[], folders: DiaryFolder[]): Promise<{ added: number; updated: number; skipped: number; foldersAdded: number }> => {
  await initDatabase();

  let foldersAdded = 0;

  // Import folders first
  for (const folder of folders) {
    const existing = await getFolderById(folder.id);
    if (!existing) {
      const database = await openDatabase();
      await database.runAsync(
        'INSERT INTO diary_folders (id, name, color, icon, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
        [folder.id, folder.name, folder.color, folder.icon, folder.createdAt, folder.updatedAt]
      );
      foldersAdded += 1;
    }
  }

  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const entry of entries) {
    const existing = await getEntryById(entry.id);
    const database = await openDatabase();
    const tags = serializeTags(entry.tags);

    if (!existing) {
      await database.runAsync(
        'INSERT INTO diary_entries (id, title, content, folderId, createdAt, updatedAt, tags, imageUris) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [entry.id, entry.title, entry.content, entry.folderId, entry.createdAt, entry.updatedAt, tags, '[]']
      );
      added += 1;
      continue;
    }

    if (new Date(entry.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
      await database.runAsync(
        'UPDATE diary_entries SET title = ?, content = ?, folderId = ?, createdAt = ?, updatedAt = ?, tags = ? WHERE id = ?',
        [entry.title, entry.content, entry.folderId, entry.createdAt, entry.updatedAt, tags, entry.id]
      );
      updated += 1;
    } else {
      skipped += 1;
    }
  }

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
  restoreEntry: typeof restoreEntry;
  permanentDeleteEntry: typeof permanentDeleteEntry;
  togglePinEntry: typeof togglePinEntry;
  listTrashedEntries: typeof listTrashedEntries;
  listEntriesByDate: typeof listEntriesByDate;
  listEntriesByMonthDay: typeof listEntriesByMonthDay;
  getDiaryStats: typeof getDiaryStats;
  emptyTrash: typeof emptyTrash;
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
  restoreEntry,
  permanentDeleteEntry,
  togglePinEntry,
  listTrashedEntries,
  listEntriesByDate,
  listEntriesByMonthDay,
  getDiaryStats,
  emptyTrash,
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
      createElement(Text, { style: { color: '#b00020', textAlign: 'center' } }, `数据库初始化失败: ${initError.message}`)
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

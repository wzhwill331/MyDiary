export type DiaryFolder = {
  id: string;
  name: string;
  color: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
};

export type DiaryEntry = {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  isPinned?: boolean;
  deletedAt?: string | null;
};

export type DiaryBackup = {
  version: 2;
  exportedAt: string;
  entries: DiaryEntry[];
  folders: DiaryFolder[];
};

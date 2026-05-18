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
  mood?: string | null;
  imageUris?: string[];
};

export const MOOD_OPTIONS = [
  { emoji: '😊', label: '开心', color: '#FFD93D' },
  { emoji: '😌', label: '平静', color: '#A8D8EA' },
  { emoji: '🥰', label: '幸福', color: '#FFB6C1' },
  { emoji: '🤔', label: '思考', color: '#C3B1E1' },
  { emoji: '😴', label: '疲惫', color: '#B0C4DE' },
  { emoji: '😢', label: '难过', color: '#87CEEB' },
  { emoji: '😤', label: '生气', color: '#FF6B6B' },
  { emoji: '🥳', label: '兴奋', color: '#FF8C00' },
  { emoji: '😰', label: '焦虑', color: '#DDA0DD' },
  { emoji: '😶', label: '无感', color: '#D3D3D3' },
];

export type DiaryBackup = {
  version: 2;
  exportedAt: string;
  entries: DiaryEntry[];
  folders: DiaryFolder[];
};

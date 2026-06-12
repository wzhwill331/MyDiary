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
  locked?: boolean;
  deletedAt?: string | null;
  mood?: string | null;
  imageUris?: string[];
  background?: string | null;
};

export type TrashedDiaryEntry = DiaryEntry & { deletedAt: string };

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

// 日记信纸背景
export type DiaryBackground = {
  id: string;
  name: string;
  background: string;   // CSS color or gradient
  textColor: string;
  placeholderColor: string;
};

export const DIARY_BACKGROUNDS: DiaryBackground[] = [
  { id: 'default', name: '默认', background: 'transparent', textColor: '', placeholderColor: '' },
  { id: 'white', name: '纯白', background: '#FFFFFF', textColor: '#333333', placeholderColor: '#999999' },
  { id: 'warm', name: '暖白', background: '#FFF8F0', textColor: '#4A3728', placeholderColor: '#B8A99A' },
  { id: 'cream', name: '米黄', background: '#FDF6E3', textColor: '#5C4B37', placeholderColor: '#C4B5A0' },
  { id: 'pink', name: '淡粉', background: '#FFF0F5', textColor: '#8B4557', placeholderColor: '#D4A0B0' },
  { id: 'blue', name: '淡蓝', background: '#F0F8FF', textColor: '#2C5F7C', placeholderColor: '#A0C4E0' },
  { id: 'green', name: '淡绿', background: '#F0FFF0', textColor: '#2E7D32', placeholderColor: '#A0D0A0' },
  { id: 'purple', name: '淡紫', background: '#F8F0FF', textColor: '#5B2C6F', placeholderColor: '#C0A0D0' },
  { id: 'lavender', name: '薰衣草', background: '#E6E6FA', textColor: '#4A3880', placeholderColor: '#B0A0C8' },
  { id: 'peach', name: '蜜桃', background: '#FFECD2', textColor: '#7C4A2D', placeholderColor: '#D4B8A0' },
  { id: 'mint', name: '薄荷', background: '#E0F7EF', textColor: '#1B5E3B', placeholderColor: '#90C8B0' },
  { id: 'kraft', name: '牛皮纸', background: '#D4A574', textColor: '#3E2723', placeholderColor: '#8D6E63' },
  { id: 'gray', name: '浅灰', background: '#F5F5F5', textColor: '#424242', placeholderColor: '#9E9E9E' },
  { id: 'dark', name: '深色', background: '#2C2C2E', textColor: '#E5E5E7', placeholderColor: '#666666' },
];

export const getDiaryBackground = (id: string | null | undefined): DiaryBackground =>
  DIARY_BACKGROUNDS.find((b) => b.id === (id ?? 'default')) ?? DIARY_BACKGROUNDS[0];

export type DiaryBackup = {
  version: 2;
  exportedAt: string;
  entries: DiaryEntry[];
  folders: DiaryFolder[];
};

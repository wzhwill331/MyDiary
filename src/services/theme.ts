import { useColorScheme } from 'react-native';
import { useSettings, ThemeMode } from './settings';

export interface ThemeColors {
  // Backgrounds
  background: string;
  card: string;
  cardBorder: string;
  modalOverlay: string;
  input: string;

  // Text
  text: string;
  textSecondary: string;
  textTertiary: string;
  placeholder: string;

  // Accents
  primary: string;
  danger: string;

  // Misc
  border: string;
  hairline: string;
  tagBg: string;
  checkbox: string;
  selectedBg: string;
  statusBar: 'light' | 'dark';
}

const ACCENT_COLORS: Record<string, { light: string; dark: string }> = {
  blue:    { light: '#007AFF', dark: '#0A84FF' },
  indigo:  { light: '#5856D6', dark: '#5E5CE6' },
  purple:  { light: '#AF52DE', dark: '#BF5AF2' },
  pink:    { light: '#FF2D55', dark: '#FF375F' },
  red:     { light: '#FF3B30', dark: '#FF453A' },
  orange:  { light: '#FF9500', dark: '#FF9F0A' },
  yellow:  { light: '#FFCC00', dark: '#FFD60A' },
  green:   { light: '#34C759', dark: '#30D158' },
  teal:    { light: '#5AC8FA', dark: '#64D2FF' },
  cyan:    { light: '#32ADE6', dark: '#66D4E1' },
};

export const ACCENT_COLOR_OPTIONS = Object.entries(ACCENT_COLORS).map(([key, val]) => ({
  id: key,
  label: key.charAt(0).toUpperCase() + key.slice(1),
  light: val.light,
  dark: val.dark,
}));

const lightColors: ThemeColors = {
  background: '#f5f5f7',
  card: '#ffffff',
  cardBorder: '#eee',
  modalOverlay: 'rgba(0,0,0,0.4)',
  input: '#f5f5f5',
  text: '#000000',
  textSecondary: '#333333',
  textTertiary: '#666666',
  placeholder: '#999999',
  primary: '#007AFF',
  danger: '#FF3B30',
  border: '#eee',
  hairline: '#eee',
  tagBg: '#eef1f4',
  checkbox: '#999',
  selectedBg: '#e8f0fe',
  statusBar: 'dark',
};

const darkColors: ThemeColors = {
  background: '#1c1c1e',
  card: '#2c2c2e',
  cardBorder: '#3a3a3c',
  modalOverlay: 'rgba(0,0,0,0.6)',
  input: '#3a3a3c',
  text: '#ffffff',
  textSecondary: '#e5e5e7',
  textTertiary: '#aaaaaa',
  placeholder: '#666666',
  primary: '#0A84FF',
  danger: '#FF453A',
  border: '#3a3a3c',
  hairline: '#3a3a3c',
  tagBg: '#3a3a3c',
  checkbox: '#666',
  selectedBg: '#1c3a5e',
  statusBar: 'light',
};

export const useThemeColors = (): ThemeColors => {
  const { settings } = useSettings();
  const systemScheme = useColorScheme();

  const isDark = settings.theme === 'dark' || (settings.theme === 'system' && systemScheme === 'dark');
  const base = isDark ? darkColors : lightColors;

  // Apply custom accent color
  const accent = ACCENT_COLORS[settings.accentColor];
  if (accent) {
    return {
      ...base,
      primary: isDark ? accent.dark : accent.light,
    };
  }
  return base;
};

export const getFontFamily = (family: string): string | undefined => {
  const map: Record<string, string | undefined> = {
    system: undefined,
    SimSun: 'SimSun',
    SimHei: 'SimHei',
    KaiTi: 'KaiTi',
  };
  return map[family];
};

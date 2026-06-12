import { useColorScheme } from 'react-native';
import { useSettings, ThemeMode } from './settings';

export interface ThemeColors {
  // Backgrounds
  background: string;
  card: string;
  cardBorder: string;
  modalOverlay: string;
  input: string;
  surfaceMuted: string;
  surfaceElevated: string;
  brandSecondary: string;
  shadow: string;
  tabBar: string;
  tabBarBorder: string;
  onPrimary: string;

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

export const DESIGN_TOKENS = {
  spacing: {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
  radius: {
    control: 12,
    card: 16,
    panel: 20,
    round: 999,
  },
  touch: {
    compact: 40,
    standard: 44,
    prominent: 48,
  },
  type: {
    caption: 11,
    meta: 12,
    body: 15,
    section: 17,
    title: 22,
    display: 30,
  },
  shadow: {
    subtle: { offsetY: 2, opacity: 0.025, radius: 7, elevation: 1 },
    card: { offsetY: 3, opacity: 0.045, radius: 10, elevation: 1 },
    overlay: { offsetY: 8, opacity: 0.14, radius: 24, elevation: 8 },
  },
} as const;

const ACCENT_COLORS: Record<string, { light: string; dark: string }> = {
  sage:    { light: '#6F8F7A', dark: '#8FB09A' },
  clay:    { light: '#B9785C', dark: '#D39A7F' },
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
  background: '#F7F4ED',
  card: '#FFFDF8',
  cardBorder: '#E7E0D4',
  modalOverlay: 'rgba(0,0,0,0.4)',
  input: '#F0ECE3',
  surfaceMuted: '#F0ECE3',
  surfaceElevated: '#FFFFFF',
  brandSecondary: '#B9785C',
  shadow: '#574B3F',
  tabBar: '#FFFEFA',
  tabBarBorder: '#E7E0D5',
  onPrimary: '#FFFFFF',
  text: '#222820',
  textSecondary: '#4B534B',
  textTertiary: '#747B73',
  placeholder: '#9A9D96',
  primary: '#6F8F7A',
  danger: '#C6534E',
  border: '#E5DED3',
  hairline: '#ECE6DC',
  tagBg: '#E9EFEA',
  checkbox: '#9A9D96',
  selectedBg: '#E3ECE5',
  statusBar: 'dark',
};

const darkColors: ThemeColors = {
  background: '#071126',
  card: 'rgba(17, 29, 55, 0.94)',
  cardBorder: '#263653',
  modalOverlay: 'rgba(0,0,0,0.6)',
  input: '#16233E',
  surfaceMuted: '#16233E',
  surfaceElevated: '#111E38',
  brandSecondary: '#E5A47F',
  shadow: '#000000',
  tabBar: 'rgba(13, 25, 48, 0.97)',
  tabBarBorder: '#263653',
  onPrimary: '#142019',
  text: '#F4F1EA',
  textSecondary: '#D6D8D2',
  textTertiary: '#A9AEA7',
  placeholder: '#777E79',
  primary: '#8FB09A',
  danger: '#F07A72',
  border: '#2A3A58',
  hairline: '#22314D',
  tagBg: '#243351',
  checkbox: '#777E79',
  selectedBg: '#2A3D4C',
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

export const useIsDarkTheme = (): boolean => {
  const { settings } = useSettings();
  const systemScheme = useColorScheme();
  return settings.theme === 'dark' || (settings.theme === 'system' && systemScheme === 'dark');
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

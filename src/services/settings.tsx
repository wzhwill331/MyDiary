import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface AppSettings {
  theme: ThemeMode;
  fontSize: number;
  fontFamily: string;
  nickname: string;
  avatarUri: string | null;
  backgroundImageUri: string | null;
  accentColor: string;
}

const SETTINGS_KEY = 'app_settings';

const defaultSettings: AppSettings = {
  theme: 'system',
  fontSize: 16,
  fontFamily: 'system',
  nickname: '小主人',
  avatarUri: null,
  backgroundImageUri: null,
  accentColor: 'sage',
};

const LEGACY_ACCENT_IDS: Record<string, string> = {
  '#007AFF': 'blue',
  '#5856D6': 'indigo',
  '#AF52DE': 'purple',
  '#FF2D55': 'pink',
  '#FF3B30': 'red',
  '#FF9500': 'orange',
  '#FFCC00': 'yellow',
  '#34C759': 'green',
  '#5AC8FA': 'teal',
  '#32ADE6': 'cyan',
};

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  updateSettings: async () => {},
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loaded, setLoaded] = useState(false);

  // Load settings from storage
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SETTINGS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const accentColor = LEGACY_ACCENT_IDS[parsed.accentColor] ?? parsed.accentColor ?? defaultSettings.accentColor;
          setSettings({ ...defaultSettings, ...parsed, accentColor });
        }
      } catch (e) {
        console.error('Failed to load settings', e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // Save settings to storage
  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  if (!loaded) return null;

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

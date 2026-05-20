import * as Crypto from 'expo-crypto';
import React, { useEffect, useState } from 'react';

// Polyfill crypto.getRandomValues for uuid
if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = { getRandomValues: Crypto.getRandomValues };
}
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Appearance, useColorScheme } from 'react-native';
import { DatabaseProvider } from './src/services/database';
import { SettingsProvider, useSettings } from './src/services/settings';
import { useThemeColors } from './src/services/theme';
import DiaryListScreen from './src/screens/DiaryListScreen';
import DiaryDetailScreen from './src/screens/DiaryDetailScreen';
import MeScreen from './src/screens/MeScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import TrashScreen from './src/screens/TrashScreen';
import TimelineScreen from './src/screens/TimelineScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import DataExportScreen from './src/screens/DataExportScreen';

export type RootStackParamList = {
  DiaryList: undefined;
  DiaryDetail: { entryId?: string; folderId?: string; templateId?: string };
  Trash: undefined;
  Timeline: undefined;
};

export type MeStackParamList = {
  MeMain: undefined;
  MeSettings: undefined;
  MeDataExport: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const MeStackNav = createNativeStackNavigator<MeStackParamList>();
const Tab = createBottomTabNavigator();

function DiaryStack() {
  return (
    <Stack.Navigator initialRouteName="DiaryList">
      <Stack.Screen name="DiaryList" component={DiaryListScreen} options={{ title: '我的日记' }} />
      <Stack.Screen name="DiaryDetail" component={DiaryDetailScreen} options={{ title: '日记详情' }} />
      <Stack.Screen name="Timeline" component={TimelineScreen} options={{ title: '时间轴' }} />
      <Stack.Screen name="Trash" component={TrashScreen} options={{ title: '回收站' }} />
    </Stack.Navigator>
  );
}

function MeStack() {
  return (
    <MeStackNav.Navigator>
      <MeStackNav.Screen name="MeMain" component={MeScreen} options={{ headerShown: false }} />
      <MeStackNav.Screen name="MeSettings" component={SettingsScreen} options={{ title: '设置' }} />
      <MeStackNav.Screen name="MeDataExport" component={DataExportScreen} options={{ title: '数据管理' }} />
    </MeStackNav.Navigator>
  );
}

function AppContent() {
  const { settings } = useSettings();
  const colors = useThemeColors();
  const systemScheme = useColorScheme();
  const [appliedScheme, setAppliedScheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (systemScheme) {
      setAppliedScheme(systemScheme as 'light' | 'dark');
    }
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      if (colorScheme) setAppliedScheme(colorScheme as 'light' | 'dark');
    });
    return () => sub.remove();
  }, [systemScheme]);

  const isDark = settings.theme === 'dark' || (settings.theme === 'system' && appliedScheme === 'dark');
  const statusBarStyle = isDark ? 'light' : 'dark';

  return (
    <>
      <NavigationContainer
        theme={{
          dark: isDark,
          colors: {
            primary: colors.primary,
            background: isDark ? '#1c1c1e' : '#f5f5f7',
            card: isDark ? '#2c2c2e' : '#fff',
            text: isDark ? '#fff' : '#000',
            border: isDark ? '#3a3a3c' : '#eee',
            notification: '#FF3B30',
          },
          fonts: {
            regular: { fontFamily: 'System' as any, fontWeight: '400' },
            medium: { fontFamily: 'System' as any, fontWeight: '500' },
            bold: { fontFamily: 'System' as any, fontWeight: '700' },
            heavy: { fontFamily: 'System' as any, fontWeight: '900' },
          },
        }}
      >
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: '#999',
            tabBarStyle: {
              borderTopColor: isDark ? '#3a3a3c' : '#eee',
              backgroundColor: isDark ? '#2c2c2e' : '#fff',
            },
          }}
        >
          <Tab.Screen
            name="DiaryTab"
            component={DiaryStack}
            options={{
              title: '日记',
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="book" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Calendar"
            component={CalendarScreen}
            options={{
              title: '日历',
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="calendar-today" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="MeTab"
            component={MeStack}
            options={{
              title: '我的',
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="person" size={size} color={color} />
              ),
            }}
          />
        </Tab.Navigator>
        <StatusBar style={statusBarStyle} />
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <DatabaseProvider>
        <SettingsProvider>
          <AppContent />
        </SettingsProvider>
      </DatabaseProvider>
    </SafeAreaProvider>
  );
}

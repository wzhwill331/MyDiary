import * as Crypto from 'expo-crypto';
import React from 'react';

// Polyfill crypto.getRandomValues for uuid
if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = { getRandomValues: Crypto.getRandomValues };
}
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DatabaseProvider } from './src/services/database';
import DiaryListScreen from './src/screens/DiaryListScreen';
import DiaryDetailScreen from './src/screens/DiaryDetailScreen';

export type RootStackParamList = {
  DiaryList: undefined;
  DiaryDetail: { entryId?: string; folderId?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <DatabaseProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="DiaryList">
            <Stack.Screen name="DiaryList" component={DiaryListScreen} options={{ title: '我的日记' }} />
            <Stack.Screen name="DiaryDetail" component={DiaryDetailScreen} options={{ title: '日记详情' }} />
          </Stack.Navigator>
          <StatusBar style="auto" />
        </NavigationContainer>
      </DatabaseProvider>
    </SafeAreaProvider>
  );
}

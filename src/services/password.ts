import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const PASSWORD_KEY = 'mydiary_folder_password';
const LOCKED_FOLDERS_KEY = 'mydiary_locked_folders';
const PASSWORD_ATTEMPTS_KEY = 'mydiary_password_attempts';

const secureStorage = {
  getItemAsync: (key: string) =>
    Platform.OS === 'web' ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key),
  setItemAsync: (key: string, value: string) =>
    Platform.OS === 'web' ? AsyncStorage.setItem(key, value) : SecureStore.setItemAsync(key, value),
  deleteItemAsync: (key: string) =>
    Platform.OS === 'web' ? AsyncStorage.removeItem(key) : SecureStore.deleteItemAsync(key),
};

type StoredPassword = {
  version: 2;
  salt: string;
  hash: string;
};

type AttemptState = {
  failures: number;
  lockedUntil: number;
};

const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');

const hashPassword = (password: string, salt: string) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);

const getAttemptState = async (): Promise<AttemptState> => {
  const raw = await secureStorage.getItemAsync(PASSWORD_ATTEMPTS_KEY);
  if (!raw) return { failures: 0, lockedUntil: 0 };
  try {
    const parsed = JSON.parse(raw) as Partial<AttemptState>;
    return {
      failures: typeof parsed.failures === 'number' ? parsed.failures : 0,
      lockedUntil: typeof parsed.lockedUntil === 'number' ? parsed.lockedUntil : 0,
    };
  } catch {
    return { failures: 0, lockedUntil: 0 };
  }
};

const setAttemptState = (state: AttemptState) =>
  secureStorage.setItemAsync(PASSWORD_ATTEMPTS_KEY, JSON.stringify(state));

// ==================== Password ====================

export const hasPassword = async (): Promise<boolean> => {
  const pw = await secureStorage.getItemAsync(PASSWORD_KEY);
  return !!pw;
};

export const setPassword = async (newPassword: string): Promise<void> => {
  const salt = bytesToHex(await Crypto.getRandomBytesAsync(16));
  const stored: StoredPassword = {
    version: 2,
    salt,
    hash: await hashPassword(newPassword, salt),
  };
  await secureStorage.setItemAsync(PASSWORD_KEY, JSON.stringify(stored));
  await setAttemptState({ failures: 0, lockedUntil: 0 });
};

export const verifyPassword = async (password: string): Promise<boolean> => {
  const attempts = await getAttemptState();
  if (attempts.lockedUntil > Date.now()) return false;

  const stored = await secureStorage.getItemAsync(PASSWORD_KEY);
  if (!stored) return false;

  let matches = false;
  try {
    const parsed = JSON.parse(stored) as StoredPassword | unknown;
    if (parsed && typeof parsed === 'object' && (parsed as StoredPassword).version === 2) {
      const value = parsed as StoredPassword;
      matches = typeof value.salt === 'string'
        && typeof value.hash === 'string'
        && await hashPassword(password, value.salt) === value.hash;
    } else {
      matches = stored === password;
      if (matches) await setPassword(password);
    }
  } catch {
    // Migrate passwords created by older app versions after a successful check.
    matches = stored === password;
    if (matches) await setPassword(password);
  }

  if (matches) {
    await setAttemptState({ failures: 0, lockedUntil: 0 });
    return true;
  }

  const failures = attempts.failures + 1;
  await setAttemptState({
    failures: failures >= 5 ? 0 : failures,
    lockedUntil: failures >= 5 ? Date.now() + 30_000 : 0,
  });
  return false;
};

// ==================== Biometric ====================

export const isBiometricAvailable = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return compatible && enrolled;
};

export const authenticateWithBiometric = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: '验证指纹以解锁文件夹',
    cancelLabel: '取消',
    disableDeviceFallback: false,
  });
  return result.success;
};

export const removePassword = async (): Promise<void> => {
  await secureStorage.deleteItemAsync(PASSWORD_KEY);
  await secureStorage.deleteItemAsync(PASSWORD_ATTEMPTS_KEY);
  // Also unlock all folders
  await secureStorage.setItemAsync(LOCKED_FOLDERS_KEY, JSON.stringify([]));
};

// ==================== Locked Folders ====================

export const getLockedFolderIds = async (): Promise<string[]> => {
  const raw = await secureStorage.getItemAsync(LOCKED_FOLDERS_KEY);
  return raw ? JSON.parse(raw) : [];
};

export const setFolderLocked = async (folderId: string, locked: boolean): Promise<void> => {
  const ids = await getLockedFolderIds();
  if (locked) {
    if (!ids.includes(folderId)) ids.push(folderId);
  } else {
    const idx = ids.indexOf(folderId);
    if (idx !== -1) ids.splice(idx, 1);
  }
  await secureStorage.setItemAsync(LOCKED_FOLDERS_KEY, JSON.stringify(ids));
};

export const isFolderLocked = async (folderId: string): Promise<boolean> => {
  const ids = await getLockedFolderIds();
  return ids.includes(folderId);
};

import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

const PASSWORD_KEY = 'mydiary_folder_password';
const LOCKED_FOLDERS_KEY = 'mydiary_locked_folders';

// ==================== Password ====================

export const hasPassword = async (): Promise<boolean> => {
  const pw = await SecureStore.getItemAsync(PASSWORD_KEY);
  return !!pw;
};

export const setPassword = async (newPassword: string): Promise<void> => {
  await SecureStore.setItemAsync(PASSWORD_KEY, newPassword);
};

export const verifyPassword = async (password: string): Promise<boolean> => {
  const stored = await SecureStore.getItemAsync(PASSWORD_KEY);
  return stored === password;
};

// ==================== Biometric ====================

export const isBiometricAvailable = async (): Promise<boolean> => {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return compatible && enrolled;
};

export const authenticateWithBiometric = async (): Promise<boolean> => {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: '验证指纹以解锁文件夹',
    cancelLabel: '取消',
    disableDeviceFallback: false,
  });
  return result.success;
};

export const removePassword = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(PASSWORD_KEY);
  // Also unlock all folders
  await SecureStore.setItemAsync(LOCKED_FOLDERS_KEY, JSON.stringify([]));
};

// ==================== Locked Folders ====================

export const getLockedFolderIds = async (): Promise<string[]> => {
  const raw = await SecureStore.getItemAsync(LOCKED_FOLDERS_KEY);
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
  await SecureStore.setItemAsync(LOCKED_FOLDERS_KEY, JSON.stringify(ids));
};

export const isFolderLocked = async (folderId: string): Promise<boolean> => {
  const ids = await getLockedFolderIds();
  return ids.includes(folderId);
};

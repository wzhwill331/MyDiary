import React, { useState } from 'react';
import { Alert, Image, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useSettings, ThemeMode } from '../services/settings';
import { useThemeColors, getFontFamily, ACCENT_COLOR_OPTIONS } from '../services/theme';
import { hasPassword, setPassword, verifyPassword, removePassword, isBiometricAvailable, authenticateWithBiometric } from '../services/password';
import { StarryBackground } from '../components/StarryBackground';

const FONT_SIZES = [
  { label: '12', value: 12 },
  { label: '14', value: 14 },
  { label: '16', value: 16 },
  { label: '18', value: 18 },
  { label: '20', value: 20 },
  { label: '22', value: 22 },
];
const FONT_FAMILIES = [
  { label: '系统', value: 'system' },
  { label: '宋体', value: 'SimSun' },
  { label: '黑体', value: 'SimHei' },
  { label: '楷体', value: 'KaiTi' },
];
const THEME_OPTIONS = [
  { label: '暖纸', value: 'light' as ThemeMode },
  { label: '星夜', value: 'dark' as ThemeMode },
  { label: '跟随系统', value: 'system' as ThemeMode },
];

const SettingsScreen = () => {
  const { settings, updateSettings } = useSettings();
  const colors = useThemeColors();
  const fontFamily = getFontFamily(settings.fontFamily) ?? 'System';

  const [hasPw, setHasPw] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwStep, setPwStep] = useState<'menu' | 'verify' | 'set' | 'remove'>('menu');
  const [pwInput, setPwInput] = useState('');
  const [pwInput2, setPwInput2] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  React.useEffect(() => {
    hasPassword().then(setHasPw);
    isBiometricAvailable().then(setBiometricAvailable);
  }, []);

  const handleFontSizeChange = (size: number) => updateSettings({ fontSize: size });
  const handleFontFamilyChange = (family: string) => updateSettings({ fontFamily: family });
  const handleThemeChange = (mode: ThemeMode) => updateSettings({ theme: mode });
  const handleAccentColorChange = (colorId: string) => updateSettings({ accentColor: colorId });

  const handlePickBackground = async () => {
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('需要照片权限', '请允许访问相册后再选择背景图片。');
        return;
      }
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
        base64: Platform.OS === 'web',
      });
      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      const sourceUri = asset.uri;
      let savedUri = sourceUri;
      const directory = FileSystem.documentDirectory
        ? `${FileSystem.documentDirectory}app-background/`
        : null;

      if (Platform.OS === 'web' && asset.base64) {
        savedUri = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
      } else if (directory) {
        await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
        const rawExtension = asset.fileName?.split('.').pop() || asset.mimeType?.split('/').pop() || 'jpg';
        const extension = rawExtension.replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
        savedUri = `${directory}background-${Date.now()}.${extension}`;
        await FileSystem.copyAsync({ from: sourceUri, to: savedUri });
      }

      const previousUri = settings.backgroundImageUri;
      await updateSettings({ backgroundImageUri: savedUri });
      if (directory && previousUri?.startsWith(directory) && previousUri !== savedUri) {
        await FileSystem.deleteAsync(previousUri, { idempotent: true }).catch(() => {});
      }
    } catch (error) {
      console.error('Failed to set custom background', error);
      Alert.alert('设置失败', '无法保存这张图片，请换一张后重试。');
    }
  };

  const handleClearBackground = async () => {
    const previousUri = settings.backgroundImageUri;
    await updateSettings({ backgroundImageUri: null });
    if (previousUri?.includes('/app-background/')) {
      await FileSystem.deleteAsync(previousUri, { idempotent: true }).catch(() => {});
    }
  };

  const handlePasswordMenu = () => {
    if (hasPw) {
      setPwStep('menu');
    } else {
      setPwStep('set');
    }
    setPwInput('');
    setPwInput2('');
    setShowPasswordModal(true);
  };

  const handleSetPassword = async () => {
    if (pwInput.length < 4) { Alert.alert('提示', '密码至少4位。'); return; }
    if (pwInput !== pwInput2) { Alert.alert('提示', '两次输入的密码不一致。'); return; }
    await setPassword(pwInput);
    setHasPw(true);
    setShowPasswordModal(false);
    Alert.alert('成功', '密码设置成功。');
  };

  const handleVerifyAndSet = async () => {
    const ok = await verifyPassword(pwInput);
    if (!ok) { Alert.alert('错误', '密码错误。'); return; }
    setPwStep('set');
    setPwInput('');
    setPwInput2('');
  };

  const handleRemovePassword = async () => {
    const ok = await verifyPassword(pwInput);
    if (!ok) { Alert.alert('错误', '密码错误。'); return; }
    await removePassword();
    setHasPw(false);
    setShowPasswordModal(false);
    Alert.alert('成功', '密码已移除，所有文件夹已解锁。');
  };

  const handleBiometricVerify = async () => {
    const ok = await authenticateWithBiometric();
    if (!ok) { Alert.alert('验证失败', '指纹验证未通过。'); return; }
    setPwStep('set');
    setPwInput('');
    setPwInput2('');
  };

  const styles = makeStyles(colors, settings.fontSize, fontFamily);

  const renderChipRow = <T extends string | number>(
    items: { label: string; value: T }[],
    current: T,
    onSelect: (v: T) => void,
  ) => (
    <View style={styles.chipRow}>
      {items.map((item) => (
        <TouchableOpacity
          key={String(item.value)}
          style={[styles.chip, current === item.value && { backgroundColor: colors.primary }]}
          onPress={() => onSelect(item.value)}
        >
          <Text style={[styles.chipText, current === item.value && { color: colors.onPrimary }]}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.screen}>
      <StarryBackground />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Font Size */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>字号</Text>
        {renderChipRow(FONT_SIZES, settings.fontSize, handleFontSizeChange)}
      </View>

      {/* Font Family */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>字体</Text>
        {renderChipRow(FONT_FAMILIES, settings.fontFamily, handleFontFamilyChange)}
      </View>

      {/* Theme */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>主题</Text>
        {renderChipRow(THEME_OPTIONS, settings.theme, handleThemeChange)}
      </View>

      {/* Accent Color */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>主题色</Text>
        <View style={styles.colorRow}>
          {ACCENT_COLOR_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.id}
              style={[
                styles.colorDot,
                { backgroundColor: opt.light },
                settings.accentColor === opt.id && styles.colorDotSelected,
              ]}
              onPress={() => handleAccentColorChange(opt.id)}
            >
              {settings.accentColor === opt.id && (
                <MaterialIcons name="check" size={14} color="#fff" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Custom background */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>自定义背景</Text>
        {settings.backgroundImageUri ? (
          <Image source={{ uri: settings.backgroundImageUri }} style={styles.backgroundPreview} resizeMode="cover" />
        ) : (
          <View style={styles.backgroundPlaceholder}>
            <MaterialIcons name="wallpaper" size={28} color={colors.primary} />
            <Text style={styles.backgroundPlaceholderText}>未设置背景图片</Text>
          </View>
        )}
        <View style={styles.backgroundActions}>
          <TouchableOpacity style={styles.backgroundButton} onPress={handlePickBackground}>
            <MaterialIcons name="photo-library" size={19} color={colors.primary} />
            <Text style={styles.backgroundButtonText}>{settings.backgroundImageUri ? '更换图片' : '选择图片'}</Text>
          </TouchableOpacity>
          {!!settings.backgroundImageUri && (
            <TouchableOpacity style={styles.backgroundButton} onPress={handleClearBackground}>
              <MaterialIcons name="delete-outline" size={19} color={colors.danger} />
              <Text style={[styles.backgroundButtonText, { color: colors.danger }]}>清除</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Password */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.menuRow} onPress={handlePasswordMenu}>
          <Text style={styles.menuTitle}>{hasPw ? '修改密码' : '设置密码'}</Text>
          <MaterialIcons name="chevron-right" size={20} color={colors.placeholder} />
        </TouchableOpacity>
      </View>

      {/* Password Modal */}
      {showPasswordModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {pwStep === 'menu' && (
              <>
                <Text style={styles.modalTitle}>密码管理</Text>
                <TouchableOpacity style={styles.modalOption} onPress={() => {
                  if (biometricAvailable) {
                    Alert.alert('验证身份', '选择验证方式', [
                      { text: '取消', style: 'cancel' },
                      { text: '使用旧密码', onPress: () => setPwStep('verify') },
                      { text: '指纹验证', onPress: handleBiometricVerify },
                    ]);
                  } else {
                    setPwStep('verify');
                  }
                }}>
                  <Text style={styles.modalOptionText}>修改密码</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalOption, { borderBottomColor: colors.danger }]} onPress={() => {
                  if (biometricAvailable) {
                    Alert.alert('验证身份', '选择验证方式', [
                      { text: '取消', style: 'cancel' },
                      { text: '使用旧密码', onPress: () => setPwStep('remove') },
                      { text: '指纹验证', onPress: async () => {
                        const ok = await authenticateWithBiometric();
                        if (ok) {
                          await removePassword();
                          setHasPw(false);
                          setShowPasswordModal(false);
                          Alert.alert('成功', '密码已移除，所有文件夹已解锁。');
                        } else {
                          Alert.alert('验证失败', '指纹验证未通过。');
                        }
                      }},
                    ]);
                  } else {
                    setPwStep('remove');
                  }
                }}>
                  <Text style={[styles.modalOptionText, { color: colors.danger }]}>移除密码</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowPasswordModal(false)}>
                  <Text style={styles.modalBtnCancelText}>取消</Text>
                </TouchableOpacity>
              </>
            )}
            {pwStep === 'verify' && (
              <>
                <Text style={styles.modalTitle}>验证密码</Text>
                <TextInput style={styles.modalInput} placeholder="输入当前密码" placeholderTextColor={colors.placeholder} secureTextEntry value={pwInput} onChangeText={setPwInput} />
                {biometricAvailable && (
                  <TouchableOpacity style={styles.biometricBtn} onPress={handleBiometricVerify}>
                    <MaterialIcons name="fingerprint" size={24} color={colors.primary} />
                    <Text style={styles.biometricBtnText}>使用指纹验证</Text>
                  </TouchableOpacity>
                )}
                <View style={styles.modalBtnRow}>
                  <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowPasswordModal(false)}>
                    <Text style={styles.modalBtnCancelText}>取消</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalBtnConfirm} onPress={handleVerifyAndSet}>
                    <Text style={styles.modalBtnConfirmText}>验证</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            {pwStep === 'set' && (
              <>
                <Text style={styles.modalTitle}>{hasPw ? '修改密码' : '设置密码'}</Text>
                <TextInput style={styles.modalInput} placeholder="输入新密码（至少4位）" placeholderTextColor={colors.placeholder} secureTextEntry value={pwInput} onChangeText={setPwInput} />
                <TextInput style={styles.modalInput} placeholder="确认新密码" placeholderTextColor={colors.placeholder} secureTextEntry value={pwInput2} onChangeText={setPwInput2} />
                <View style={styles.modalBtnRow}>
                  <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowPasswordModal(false)}>
                    <Text style={styles.modalBtnCancelText}>取消</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalBtnConfirm} onPress={handleSetPassword}>
                    <Text style={styles.modalBtnConfirmText}>确定</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            {pwStep === 'remove' && (
              <>
                <Text style={styles.modalTitle}>验证密码以移除</Text>
                <TextInput style={styles.modalInput} placeholder="输入当前密码" placeholderTextColor={colors.placeholder} secureTextEntry value={pwInput} onChangeText={setPwInput} />
                <View style={styles.modalBtnRow}>
                  <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowPasswordModal(false)}>
                    <Text style={styles.modalBtnCancelText}>取消</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtnConfirm, { backgroundColor: colors.danger }]} onPress={handleRemovePassword}>
                    <Text style={styles.modalBtnConfirmText}>移除</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      )}
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useThemeColors>, fontSize: number, fontFamily: string) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 18, paddingBottom: 44 },
  section: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 12,
    fontFamily,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
  },
  chipText: {
    fontSize: fontSize - 2,
    color: colors.text,
    fontFamily,
  },
  backgroundPreview: {
    width: '100%',
    height: 150,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
  },
  backgroundPlaceholder: {
    height: 104,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  backgroundPlaceholderText: {
    fontSize: 13,
    color: colors.textTertiary,
    fontFamily,
  },
  backgroundActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  backgroundButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  backgroundButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    fontFamily,
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuTitle: {
    fontSize: fontSize,
    color: colors.text,
    fontFamily,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.modalOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  modalContent: {
    width: '88%',
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    fontSize: fontSize,
    color: colors.text,
    marginBottom: 12,
    fontFamily,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  modalBtnCancel: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
  },
  modalBtnCancelText: {
    fontSize: 15,
    color: colors.text,
    fontFamily,
  },
  modalBtnConfirm: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  modalBtnConfirmText: {
    fontSize: 15,
    color: '#fff',
    fontFamily,
  },
  modalOption: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  modalOptionText: {
    fontSize: 16,
    color: colors.text,
    fontFamily,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 12,
    backgroundColor: colors.primary + '15',
  },
  biometricBtnText: {
    fontSize: 14,
    color: colors.primary,
    fontFamily,
  },
});

export default SettingsScreen;

import React, { useEffect, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { authenticateWithBiometric, isBiometricAvailable, verifyPassword } from '../services/password';
import { useThemeColors } from '../services/theme';

type Props = {
  visible: boolean;
  title?: string;
  onCancel: () => void;
  onUnlocked: () => void;
};

const UnlockModal = ({ visible, title = '解锁日记', onCancel, onUnlocked }: Props) => {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const [password, setPassword] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    if (!visible) {
      setPassword('');
      return;
    }
    isBiometricAvailable().then(setBiometricAvailable).catch(() => setBiometricAvailable(false));
  }, [visible]);

  const unlockWithPassword = async () => {
    if (!password) return;
    if (await verifyPassword(password)) {
      setPassword('');
      onUnlocked();
    } else {
      Alert.alert('验证失败', '密码错误。');
    }
  };

  const unlockWithBiometric = async () => {
    if (await authenticateWithBiometric()) onUnlocked();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <MaterialIcons name="lock" size={32} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>输入应用密码后才能查看内容。</Text>
          <TextInput
            style={styles.input}
            placeholder="应用密码"
            placeholderTextColor={colors.placeholder}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoFocus
            returnKeyType="done"
            onSubmitEditing={unlockWithPassword}
          />
          <View style={styles.actions}>
            <TouchableOpacity style={styles.button} onPress={onCancel}>
              <Text style={{ color: colors.textSecondary }}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={unlockWithPassword}>
              <Text style={styles.primaryText}>解锁</Text>
            </TouchableOpacity>
          </View>
          {biometricAvailable && (
            <TouchableOpacity style={styles.biometric} onPress={unlockWithBiometric}>
              <MaterialIcons name="fingerprint" size={26} color={colors.primary} />
              <Text style={{ color: colors.primary }}>使用生物识别</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const makeStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.modalOverlay, justifyContent: 'center', padding: 24 },
  card: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 6,
  },
  title: { marginTop: 10, fontSize: 18, fontWeight: '700' },
  description: { marginTop: 6, marginBottom: 16, fontSize: 13 },
  input: { width: '100%', borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceMuted },
  actions: { width: '100%', flexDirection: 'row', gap: 10, marginTop: 14 },
  button: { flex: 1, minHeight: 46, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '600' },
  biometric: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, padding: 6 },
});

export default UnlockModal;

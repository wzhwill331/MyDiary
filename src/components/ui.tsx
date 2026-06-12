import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { DESIGN_TOKENS, useThemeColors } from '../services/theme';
import { StarryBackground } from './StarryBackground';

export const ScreenScaffold = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) => {
  const colors = useThemeColors();
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }, style]}>
      <StarryBackground />
      {children}
    </View>
  );
};

export const SurfaceCard = ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => {
  const colors = useThemeColors();
  return <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, shadowColor: colors.shadow }, style]}>{children}</View>;
};

export const SectionHeader = ({ title, action }: { title: string; action?: React.ReactNode }) => {
  const colors = useThemeColors();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {action}
    </View>
  );
};

export const EmptyState = ({ icon, title, description }: { icon: React.ComponentProps<typeof MaterialIcons>['name']; title: string; description?: string }) => {
  const colors = useThemeColors();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceMuted }]}>
        <MaterialIcons name={icon} size={34} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      {!!description && <Text style={[styles.emptyDescription, { color: colors.textTertiary }]}>{description}</Text>}
    </View>
  );
};

export const LoadingState = ({ label = '正在加载…' }: { label?: string }) => {
  const colors = useThemeColors();
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={[styles.loadingText, { color: colors.textTertiary }]}>{label}</Text>
    </View>
  );
};

export const Pill = ({ children, active = false }: { children: React.ReactNode; active?: boolean }) => {
  const colors = useThemeColors();
  return (
    <View style={[styles.pill, { backgroundColor: active ? colors.primary : colors.surfaceMuted }]}>
      <Text style={[styles.pillText, { color: active ? colors.onPrimary : colors.textSecondary }]}>{children}</Text>
    </View>
  );
};

export const PrimaryButton = ({ label, icon, onPress, danger = false }: { label: string; icon?: React.ComponentProps<typeof MaterialIcons>['name']; onPress: () => void; danger?: boolean }) => {
  const colors = useThemeColors();
  const backgroundColor = danger ? colors.danger : colors.primary;
  return (
    <TouchableOpacity style={[styles.primaryButton, { backgroundColor }]} onPress={onPress} activeOpacity={0.82}>
      {!!icon && <MaterialIcons name={icon} size={19} color={colors.onPrimary} />}
      <Text style={[styles.primaryButtonText, { color: colors.onPrimary }]}>{label}</Text>
    </TouchableOpacity>
  );
};

export const ActionButton = ({
  label,
  icon,
  onPress,
  variant = 'secondary',
  disabled = false,
  loading = false,
}: {
  label: string;
  icon?: React.ComponentProps<typeof MaterialIcons>['name'];
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
}) => {
  const colors = useThemeColors();
  const isPrimary = variant === 'primary';
  const foreground = variant === 'danger' ? colors.danger : isPrimary ? colors.onPrimary : colors.textSecondary;
  const background = variant === 'danger'
    ? colors.danger + '14'
    : isPrimary
      ? colors.primary
      : variant === 'ghost'
        ? 'transparent'
        : colors.surfaceMuted;
  return (
    <TouchableOpacity
      style={[styles.actionButton, { backgroundColor: background, opacity: disabled ? 0.45 : 1 }]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.72}
    >
      {loading
        ? <ActivityIndicator size="small" color={foreground} />
        : icon && <MaterialIcons name={icon} size={18} color={foreground} />}
      <Text style={[styles.actionButtonText, { color: foreground }]}>{label}</Text>
    </TouchableOpacity>
  );
};

export const IconButton = ({
  icon,
  onPress,
  selected = false,
  danger = false,
  accessibilityLabel,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  onPress: () => void;
  selected?: boolean;
  danger?: boolean;
  accessibilityLabel: string;
}) => {
  const colors = useThemeColors();
  const color = danger ? colors.danger : selected ? colors.primary : colors.textSecondary;
  return (
    <TouchableOpacity
      accessibilityLabel={accessibilityLabel}
      style={[styles.iconButton, selected && { backgroundColor: colors.selectedBg }]}
      onPress={onPress}
      activeOpacity={0.68}
    >
      <MaterialIcons name={icon} size={22} color={color} />
    </TouchableOpacity>
  );
};

export const Field = (props: TextInputProps) => {
  const colors = useThemeColors();
  return (
    <TextInput
      {...props}
      placeholderTextColor={props.placeholderTextColor || colors.placeholder}
      style={[styles.field, { color: colors.text, backgroundColor: colors.surfaceMuted, borderColor: colors.border }, props.style]}
    />
  );
};

export const SettingGroup = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const colors = useThemeColors();
  return (
    <View style={styles.settingGroup}>
      <Text style={[styles.settingGroupTitle, { color: colors.textTertiary }]}>{title}</Text>
      <View style={[styles.settingGroupBody, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        {children}
      </View>
    </View>
  );
};

export const StatusBanner = ({
  type,
  title,
  description,
}: {
  type: 'info' | 'success' | 'warning' | 'error' | 'locked';
  title: string;
  description?: string;
}) => {
  const colors = useThemeColors();
  const config = {
    info: { icon: 'info-outline' as const, color: colors.primary },
    success: { icon: 'check-circle-outline' as const, color: '#56866A' },
    warning: { icon: 'error-outline' as const, color: colors.brandSecondary },
    error: { icon: 'cancel' as const, color: colors.danger },
    locked: { icon: 'lock-outline' as const, color: colors.brandSecondary },
  }[type];
  return (
    <View style={[styles.statusBanner, { backgroundColor: config.color + '12', borderColor: config.color + '35' }]}>
      <MaterialIcons name={config.icon} size={20} color={config.color} />
      <View style={styles.statusCopy}>
        <Text style={[styles.statusTitle, { color: colors.text }]}>{title}</Text>
        {!!description && <Text style={[styles.statusDescription, { color: colors.textTertiary }]}>{description}</Text>}
      </View>
    </View>
  );
};

export const StatBlock = ({ value, label }: { value: string | number; label: string }) => {
  const colors = useThemeColors();
  return (
    <View style={styles.statBlock}>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: 'hidden' },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.045,
    shadowRadius: 10,
    elevation: 1,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },
  empty: { alignItems: 'center', paddingHorizontal: 28, paddingVertical: 44 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyDescription: { fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 7 },
  loading: { alignItems: 'center', justifyContent: 'center', paddingVertical: 52, gap: 12 },
  loadingText: { fontSize: 13 },
  pill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  pillText: { fontSize: 13, fontWeight: '600' },
  primaryButton: { minHeight: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 18 },
  primaryButtonText: { fontSize: 15, fontWeight: '700' },
  actionButton: {
    minHeight: DESIGN_TOKENS.touch.standard,
    borderRadius: DESIGN_TOKENS.radius.control,
    paddingHorizontal: DESIGN_TOKENS.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DESIGN_TOKENS.spacing.xs,
  },
  actionButtonText: { fontSize: 14, fontWeight: '700' },
  iconButton: {
    width: DESIGN_TOKENS.touch.standard,
    height: DESIGN_TOKENS.touch.standard,
    borderRadius: DESIGN_TOKENS.radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: {
    minHeight: DESIGN_TOKENS.touch.prominent,
    borderRadius: DESIGN_TOKENS.radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: DESIGN_TOKENS.spacing.md,
    fontSize: DESIGN_TOKENS.type.body,
  },
  settingGroup: { marginBottom: DESIGN_TOKENS.spacing.lg },
  settingGroupTitle: {
    marginHorizontal: DESIGN_TOKENS.spacing.xs,
    marginBottom: DESIGN_TOKENS.spacing.xs,
    fontSize: DESIGN_TOKENS.type.meta,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  settingGroupBody: {
    overflow: 'hidden',
    borderRadius: DESIGN_TOKENS.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusBanner: {
    minHeight: 58,
    borderRadius: DESIGN_TOKENS.radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    padding: DESIGN_TOKENS.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: DESIGN_TOKENS.spacing.sm,
  },
  statusCopy: { flex: 1 },
  statusTitle: { fontSize: 14, fontWeight: '700' },
  statusDescription: { marginTop: 2, fontSize: 12, lineHeight: 17 },
  statBlock: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  statValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  statLabel: { fontSize: 10, marginTop: 4 },
});

import React, { useCallback, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSettings } from '../services/settings';
import { useThemeColors, getFontFamily } from '../services/theme';
import { useDatabase } from '../services/database';
import {
  exportDiaryEntriesToJson,
  exportDiaryEntriesToHtml,
  exportDiaryEntriesToMarkdown,
  importDiaryEntriesFromJson,
  importDiaryEntriesFromMarkdown,
} from '../utils/export';
import UnlockModal from '../components/UnlockModal';
import { ActionButton } from '../components/ui';
import { StarryBackground } from '../components/StarryBackground';
import { getLockedFolderIds, hasPassword } from '../services/password';

const DataExportScreen = () => {
  const database = useDatabase();
  const { settings } = useSettings();
  const colors = useThemeColors();
  const fontFamily = getFontFamily(settings.fontFamily) ?? 'System';
  const [showExportModal, setShowExportModal] = useState(false);
  const [showExportUnlock, setShowExportUnlock] = useState(false);
  const [pendingFormat, setPendingFormat] = useState<'json' | 'html' | 'md' | null>(null);

  const executeExport = useCallback(async (format: 'json' | 'html' | 'md') => {
    switch (format) {
      case 'json': await exportDiaryEntriesToJson(database); break;
      case 'html': await exportDiaryEntriesToHtml(database); break;
      case 'md': await exportDiaryEntriesToMarkdown(database); break;
    }
  }, [database]);

  const handleExport = useCallback(async (format: 'json' | 'html' | 'md') => {
    setShowExportModal(false);
    const [backup, lockedFolderIds] = await Promise.all([
      database.exportEntries(),
      getLockedFolderIds(),
    ]);
    const includesProtected = backup.entries.some(
      (entry) => entry.locked || (!!entry.folderId && lockedFolderIds.includes(entry.folderId))
    );
    if (includesProtected) {
      if (!(await hasPassword())) {
        Alert.alert('无法导出', '存在锁定日记，但应用密码尚未设置。');
        return;
      }
      setPendingFormat(format);
      setShowExportUnlock(true);
      return;
    }
    await executeExport(format);
  }, [database, executeExport]);

  const handleImport = useCallback(() => {
    Alert.alert('导入日记', '选择要导入的文件格式', [
      { text: '取消', style: 'cancel' },
      { text: 'JSON 备份', onPress: async () => { await importDiaryEntriesFromJson(database); } },
      { text: 'Markdown', onPress: async () => { await importDiaryEntriesFromMarkdown(database); } },
    ]);
  }, [database]);

  const styles = makeStyles(colors, settings.fontSize, fontFamily);

  return (
    <View style={styles.screen}>
      <StarryBackground />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={[styles.heroIcon, { backgroundColor: colors.selectedBg }]}>
          <MaterialIcons name="inventory-2" size={28} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>保管你的文字</Text>
          <Text style={styles.heroSubtitle}>定期备份，让每一段记录都有归处</Text>
        </View>
      </View>
      <View style={styles.section}>
        <TouchableOpacity style={styles.menuRow} onPress={() => setShowExportModal(true)}>
          <View style={styles.menuLeft}>
            <MaterialIcons name="ios-share" size={22} color={colors.primary} />
            <Text style={styles.menuTitle}>导出日记</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={colors.placeholder} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.menuRow} onPress={handleImport}>
          <View style={styles.menuLeft}>
            <MaterialIcons name="file-download" size={22} color={colors.primary} />
            <Text style={styles.menuTitle}>导入日记</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={colors.placeholder} />
        </TouchableOpacity>
      </View>

      <View style={styles.hintCard}>
        <Text style={styles.hintTitle}>格式说明</Text>
        <Text style={styles.hint}>JSON  ·  完整备份，可重新导入{'\n'}HTML  ·  适合阅读和打印{'\n'}Markdown  ·  纯文本，兼容性好</Text>
      </View>

      {/* Export Format Modal */}
      <Modal visible={showExportModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>导出全部日记</Text>
            <TouchableOpacity style={styles.exportOption} onPress={() => handleExport('json')}>
              <MaterialIcons name="code" size={28} color={colors.primary} />
              <View style={styles.exportOptionText}>
                <Text style={styles.exportOptionTitle}>JSON 备份</Text>
                <Text style={styles.exportOptionDesc}>完整数据，可重新导入</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportOption} onPress={() => handleExport('html')}>
              <MaterialIcons name="web" size={28} color="#34C759" />
              <View style={styles.exportOptionText}>
                <Text style={styles.exportOptionTitle}>HTML 网页</Text>
                <Text style={styles.exportOptionDesc}>精美排版，适合阅读</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportOption} onPress={() => handleExport('md')}>
              <MaterialIcons name="description" size={28} color="#5856D6" />
              <View style={styles.exportOptionText}>
                <Text style={styles.exportOptionTitle}>Markdown</Text>
                <Text style={styles.exportOptionDesc}>纯文本格式，兼容性好</Text>
              </View>
            </TouchableOpacity>
            <ActionButton label="取消" icon="close" onPress={() => setShowExportModal(false)} />
          </View>
        </View>
      </Modal>
      <UnlockModal
        visible={showExportUnlock}
        title="验证后导出"
        onCancel={() => {
          setShowExportUnlock(false);
          setPendingFormat(null);
        }}
        onUnlocked={() => {
          const format = pendingFormat;
          setShowExportUnlock(false);
          setPendingFormat(null);
          if (format) void executeExport(format);
        }}
      />
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useThemeColors>, fontSize: number, fontFamily: string) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 18, paddingBottom: 40 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20, paddingHorizontal: 2 },
  heroIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 21, fontWeight: '800', color: colors.text },
  heroSubtitle: { fontSize: 13, lineHeight: 19, color: colors.textTertiary, marginTop: 3 },
  section: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 1,
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuTitle: {
    fontSize: fontSize,
    color: colors.text,
    fontFamily,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 50,
  },
  hintCard: { marginTop: 18, padding: 16, borderRadius: 16, backgroundColor: colors.surfaceMuted },
  hintTitle: { fontSize: 14, fontWeight: '700', color: colors.textSecondary, marginBottom: 7 },
  hint: {
    fontSize: 12,
    color: colors.textTertiary,
    lineHeight: 21,
    fontFamily,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.modalOverlay,
    justifyContent: 'center',
    alignItems: 'center',
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
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  exportOptionText: {
    flex: 1,
  },
  exportOptionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    fontFamily,
  },
  exportOptionDesc: {
    fontSize: 13,
    color: colors.placeholder,
    marginTop: 2,
    fontFamily,
  },
  modalBtnCancel: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
  },
  modalBtnCancelText: {
    fontSize: 15,
    color: colors.text,
    fontFamily,
  },
});

export default DataExportScreen;

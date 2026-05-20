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

const DataExportScreen = () => {
  const database = useDatabase();
  const { settings } = useSettings();
  const colors = useThemeColors();
  const fontFamily = getFontFamily(settings.fontFamily) ?? 'System';
  const [showExportModal, setShowExportModal] = useState(false);

  const handleExport = useCallback(async (format: 'json' | 'html' | 'md') => {
    setShowExportModal(false);
    switch (format) {
      case 'json': await exportDiaryEntriesToJson(database); break;
      case 'html': await exportDiaryEntriesToHtml(database); break;
      case 'md': await exportDiaryEntriesToMarkdown(database); break;
    }
  }, [database]);

  const handleImport = useCallback(() => {
    Alert.alert('导入日记', '选择要导入的文件格式', [
      { text: '取消', style: 'cancel' },
      { text: 'JSON 备份', onPress: async () => { await importDiaryEntriesFromJson(database); } },
      { text: 'Markdown', onPress: async () => { await importDiaryEntriesFromMarkdown(database); } },
    ]);
  }, [database]);

  const styles = makeStyles(colors, settings.fontSize, fontFamily);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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

      <Text style={styles.hint}>
        导出格式说明{'\n'}
        • JSON — 完整备份，可重新导入{'\n'}
        • HTML — 精美网页，可在浏览器查看{'\n'}
        • Markdown — 纯文本格式，兼容性好
      </Text>

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
            <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowExportModal(false)}>
              <Text style={styles.modalBtnCancelText}>取消</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const makeStyles = (colors: ReturnType<typeof useThemeColors>, fontSize: number, fontFamily: string) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  section: {
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: 'hidden',
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
  hint: {
    fontSize: 12,
    color: colors.placeholder,
    marginTop: 20,
    lineHeight: 18,
    fontFamily,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: colors.card,
    borderRadius: 16,
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
    borderRadius: 8,
    backgroundColor: colors.border,
  },
  modalBtnCancelText: {
    fontSize: 15,
    color: colors.text,
    fontFamily,
  },
});

export default DataExportScreen;

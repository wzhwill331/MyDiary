import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSettings, ThemeMode } from '../services/settings';
import { useThemeColors } from '../services/theme';
import { useDatabase } from '../services/database';
import { hasPassword, setPassword, verifyPassword, removePassword } from '../services/password';
import { DiaryEntry, DiaryFolder } from '../types/diary';
import {
  exportDiaryEntriesToJson,
  exportDiaryEntriesToHtml,
  exportDiaryEntriesToMarkdown,
  importDiaryEntriesFromJson,
  importDiaryEntriesFromMarkdown,
} from '../utils/export';

const FONT_SIZES = [
  { label: '小', value: 14 },
  { label: '中', value: 16 },
  { label: '大', value: 18 },
  { label: '特大', value: 20 },
];

const FONT_FAMILIES = [
  { label: '系统默认', value: 'system' },
  { label: '宋体', value: 'SimSun' },
  { label: '黑体', value: 'SimHei' },
  { label: '楷体', value: 'KaiTi' },
];

type SelectStep = 'folder' | 'entry';

const MeScreen = () => {
  const { settings, updateSettings } = useSettings();
  const colors = useThemeColors();
  const database = useDatabase();
  const navigation = useNavigation();
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [nicknameInput, setNicknameInput] = useState(settings.nickname);
  const [stats, setStats] = useState({ totalEntries: 0, monthEntries: 0, totalChars: 0, streak: 0 });

  // Export states
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportTargetIds, setExportTargetIds] = useState<string[] | null>(null);

  // Selective export states
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordStep, setPasswordStep] = useState<'menu' | 'set' | 'verify' | 'change'>('menu');
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [hasPw, setHasPw] = useState(false);
  const [selectStep, setSelectStep] = useState<SelectStep>('folder');
  const [folders, setFolders] = useState<DiaryFolder[]>([]);
  const [allEntries, setAllEntries] = useState<DiaryEntry[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | 'all' | 'unfiled' | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      hasPassword().then(setHasPw);
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const s = await database.getDiaryStats();
          setStats(s);
        } catch (e) {
          console.error('Failed to load stats', e);
        }
      })();
    }, [database])
  );

  const handleThemeChange = (mode: ThemeMode) => updateSettings({ theme: mode });
  const handleFontSizeChange = (size: number) => updateSettings({ fontSize: size });
  const handleFontFamilyChange = (family: string) => updateSettings({ fontFamily: family });

  const handlePickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      updateSettings({ avatarUri: result.assets[0].uri });
    }
  };

  const handleSaveNickname = () => {
    const name = nicknameInput.trim();
    if (name) updateSettings({ nickname: name });
    setShowNicknameModal(false);
  };

  // ==================== Import ====================

  const handleImport = () => {
    Alert.alert('导入日记', '选择要导入的文件格式', [
      { text: '取消', style: 'cancel' },
      { text: 'JSON 备份', onPress: async () => { await importDiaryEntriesFromJson(database); } },
      { text: 'Markdown', onPress: async () => { await importDiaryEntriesFromMarkdown(database); } },
    ]);
  };

  // ==================== Export All ====================

  const handleExportAll = () => setShowExportModal(true);

  const handleExport = (type: 'json' | 'html' | 'md') => {
    setShowExportModal(false);
    const ids = exportTargetIds ?? undefined;
    if (type === 'json') exportDiaryEntriesToJson(database, ids);
    else if (type === 'html') exportDiaryEntriesToHtml(database, ids);
    else exportDiaryEntriesToMarkdown(database, ids);
    setExportTargetIds(null);
  };

  // ==================== Selective Export ====================

  const handleExportSelect = async () => {
    try {
      const [folderList, entryList] = await Promise.all([
        database.listFolders(),
        database.listEntries(),
      ]);
      setFolders(folderList);
      setAllEntries(entryList);
      setSelectedIds(new Set());
      setSelectedFolderId(null);
      setSelectStep('folder');
      setShowSelectModal(true);
    } catch (error) {
      Alert.alert('错误', '加载数据失败。');
    }
  };

  const getFolderEntries = (folderId: string | 'all' | 'unfiled') => {
    if (folderId === 'all') return allEntries;
    if (folderId === 'unfiled') return allEntries.filter((e) => !e.folderId);
    return allEntries.filter((e) => e.folderId === folderId);
  };

  const getFolderCount = (folderId: string | 'all' | 'unfiled') => {
    return getFolderEntries(folderId).length;
  };

  const handleSelectFolder = (folderId: string | 'all' | 'unfiled') => {
    setSelectedFolderId(folderId);
    // Select all entries in this folder by default
    const entries = getFolderEntries(folderId);
    setSelectedIds(new Set(entries.map((e) => e.id)));
    setSelectStep('entry');
  };

  const handleBackToFolders = () => {
    setSelectStep('folder');
    setSelectedIds(new Set());
    setSelectedFolderId(null);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (!selectedFolderId) return;
    const entries = getFolderEntries(selectedFolderId);
    if (selectedIds.size === entries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(entries.map((e) => e.id)));
    }
  };

  const handleConfirmSelect = () => {
    if (selectedIds.size === 0) {
      Alert.alert('提示', '请先选择要导出的日记。');
      return;
    }
    setShowSelectModal(false);
    setExportTargetIds(Array.from(selectedIds));
    setShowExportModal(true);
  };

  // ==================== Password ====================

  const handlePasswordMenu = () => {
    if (hasPw) {
      setPasswordStep('verify');
    } else {
      setPasswordStep('set');
    }
    setPasswordInput('');
    setPasswordConfirm('');
    setShowPasswordModal(true);
  };

  const handleSetPassword = async () => {
    if (passwordInput.length < 4) {
      Alert.alert('提示', '密码至少4位。');
      return;
    }
    if (passwordInput !== passwordConfirm) {
      Alert.alert('提示', '两次输入的密码不一致。');
      return;
    }
    await setPassword(passwordInput);
    setHasPw(true);
    setShowPasswordModal(false);
    Alert.alert('成功', '密码设置成功。');
  };

  const handleVerifyPassword = async () => {
    const ok = await verifyPassword(passwordInput);
    if (ok) {
      setPasswordStep('menu');
      setPasswordInput('');
    } else {
      Alert.alert('错误', '密码错误。');
    }
  };

  const handleChangePassword = async () => {
    const ok = await verifyPassword(passwordInput);
    if (!ok) {
      Alert.alert('错误', '当前密码错误。');
      return;
    }
    setPasswordStep('set');
    setPasswordInput('');
    setPasswordConfirm('');
  };

  const handleRemovePassword = async () => {
    const ok = await verifyPassword(passwordInput);
    if (!ok) {
      Alert.alert('错误', '密码错误。');
      return;
    }
    await removePassword();
    setHasPw(false);
    setShowPasswordModal(false);
    Alert.alert('成功', '密码已移除，所有文件夹已解锁。');
  };

  const handleAbout = () => {
    Alert.alert('关于 MyDiary', '版本：1.3.0\n\n一款简洁优雅的日记应用\n支持 Markdown、图片、标签、分类管理', [{ text: '确定' }]);
  };

  const handleSponsor = () => {
    Alert.alert('赞助作者 ❤️', '感谢你的支持！', [
      { text: '微信赞赏', onPress: () => Alert.alert('提示', '请扫描赞赏码') },
      { text: 'GitHub Sponsors', onPress: () => Linking.openURL('https://github.com/sponsors') },
      { text: '取消', style: 'cancel' },
    ]);
  };

  const styles = makeStyles(colors);

  const renderSection = (title: string | null, children: React.ReactNode) => (
    <View style={styles.section}>
      {title !== null && (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionDiamond}>◇</Text>
          <Text style={styles.sectionTitle}>{title}</Text>
          <View style={styles.sectionLine} />
        </View>
      )}
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );

  const renderSettingRow = (title: string, onPress?: () => void, right?: React.ReactNode) => (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} disabled={!onPress} activeOpacity={onPress ? 0.6 : 1}>
      <Text style={styles.settingTitle}>{title}</Text>
      {right || <MaterialIcons name="chevron-right" size={20} color={colors.placeholder} />}
    </TouchableOpacity>
  );

  const renderChips = <T extends string | number>(items: { label: string; value: T }[], current: T, onSelect: (v: T) => void) => (
    <View style={styles.chipRow}>
      {items.map((item) => (
        <TouchableOpacity key={String(item.value)} style={[styles.chip, current === item.value && { backgroundColor: colors.text }]} onPress={() => onSelect(item.value)}>
          <Text style={[styles.chipText, current === item.value && { color: colors.card }]}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // ==================== Folder Selection View ====================

  const renderFolderSelectView = () => {
    const folderItems: { id: string | 'all' | 'unfiled'; name: string; icon: string; color: string; count: number }[] = [
      { id: 'all', name: '全部日记', icon: 'list', color: colors.primary, count: getFolderCount('all') },
      { id: 'unfiled', name: '未分类', icon: 'inbox', color: colors.textTertiary, count: getFolderCount('unfiled') },
      ...folders.map((f) => ({ id: f.id, name: f.name, icon: f.icon, color: f.color, count: getFolderCount(f.id) })),
    ];

    return (
      <>
        <Text style={styles.selectModalSubtitle}>选择文件夹，或点击右侧勾选整组</Text>
        <ScrollView style={styles.selectList}>
          {folderItems.map((folder) => {
            const folderEntries = getFolderEntries(folder.id);
            const allSelected = folderEntries.length > 0 && folderEntries.every((e) => selectedIds.has(e.id));
            const someSelected = folderEntries.some((e) => selectedIds.has(e.id));

            return (
              <View key={String(folder.id)} style={styles.folderSelectRow}>
                <TouchableOpacity style={styles.folderSelectLeft} onPress={() => handleSelectFolder(folder.id)}>
                  <MaterialIcons name={folder.icon as any} size={20} color={folder.color} />
                  <Text style={styles.folderSelectName}>{folder.name}</Text>
                  <Text style={styles.folderSelectCount}>{folder.count} 篇</Text>
                  <MaterialIcons name="chevron-right" size={18} color={colors.placeholder} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.folderSelectCheck}
                  onPress={() => {
                    // Toggle all entries in this folder
                    if (allSelected) {
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        folderEntries.forEach((e) => next.delete(e.id));
                        return next;
                      });
                    } else {
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        folderEntries.forEach((e) => next.add(e.id));
                        return next;
                      });
                    }
                  }}
                >
                  <MaterialIcons
                    name={allSelected ? 'check-box' : someSelected ? 'check-box-outline-blank' : 'check-box-outline-blank'}
                    size={22}
                    color={allSelected ? colors.primary : someSelected ? colors.primary : colors.placeholder}
                  />
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      </>
    );
  };

  // ==================== Entry Selection View ====================

  const renderEntrySelectView = () => {
    const entries = selectedFolderId ? getFolderEntries(selectedFolderId) : [];
    const folderName = selectedFolderId === 'all' ? '全部日记' : selectedFolderId === 'unfiled' ? '未分类' : folders.find((f) => f.id === selectedFolderId)?.name ?? '';

    return (
      <>
        <View style={styles.selectBreadcrumb}>
          <TouchableOpacity onPress={handleBackToFolders} style={styles.breadcrumbBack}>
            <MaterialIcons name="arrow-back" size={20} color={colors.primary} />
            <Text style={styles.breadcrumbText}>返回</Text>
          </TouchableOpacity>
          <Text style={styles.breadcrumbSep}>/</Text>
          <Text style={styles.breadcrumbCurrent}>{folderName}</Text>
        </View>
        <Text style={styles.selectModalSubtitle}>已选 {selectedIds.size}/{entries.length} 篇</Text>
        <ScrollView style={styles.selectList}>
          {entries.map((entry) => (
            <TouchableOpacity
              key={entry.id}
              style={[styles.selectItem, selectedIds.has(entry.id) && styles.selectItemActive]}
              onPress={() => toggleSelect(entry.id)}
            >
              <MaterialIcons
                name={selectedIds.has(entry.id) ? 'check-box' : 'check-box-outline-blank'}
                size={22}
                color={selectedIds.has(entry.id) ? colors.primary : colors.placeholder}
              />
              <View style={styles.selectItemContent}>
                <Text style={styles.selectItemTitle} numberOfLines={1}>{entry.title || '无标题'}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Avatar */}
      <TouchableOpacity style={styles.avatarWrapper} onPress={handlePickAvatar} activeOpacity={0.7}>
        {settings.avatarUri ? (
          <Image source={{ uri: settings.avatarUri }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>{settings.nickname.charAt(0).toUpperCase()}</Text>
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => { setNicknameInput(settings.nickname); setShowNicknameModal(true); }}>
        <Text style={styles.nickname}>{settings.nickname}</Text>
      </TouchableOpacity>

      {/* Stats Card */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.totalEntries}</Text>
          <Text style={styles.statLabel}>总篇数</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.monthEntries}</Text>
          <Text style={styles.statLabel}>本月</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.totalChars.toLocaleString()}</Text>
          <Text style={styles.statLabel}>总字数</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.streak}</Text>
          <Text style={styles.statLabel}>连续天数</Text>
        </View>
      </View>

      {/* Data & Export */}
      {renderSection('数据与印记', <>
        {renderSettingRow('导出日记', handleExportAll)}
        {renderSettingRow('选择性导出', handleExportSelect)}
        {renderSettingRow('导入日记', handleImport)}
        {renderSettingRow('回收站', () => navigation.navigate('DiaryTab', { screen: 'Trash' }))}
      </>)}

      {/* Visual */}
      {renderSection('视觉与感知', <>
        <View style={styles.settingRowNoArrow}><Text style={styles.settingTitle}>排版与留白</Text></View>
        <View style={styles.chipSection}>
          <Text style={styles.chipLabel}>字号</Text>
          {renderChips(FONT_SIZES, settings.fontSize, handleFontSizeChange)}
        </View>
        <View style={styles.chipSection}>
          <Text style={styles.chipLabel}>字体</Text>
          {renderChips(FONT_FAMILIES, settings.fontFamily, handleFontFamilyChange)}
        </View>
        <View style={styles.chipSection}>
          <Text style={styles.chipLabel}>主题</Text>
          {renderChips([
            { label: '浅色', value: 'light' as ThemeMode },
            { label: '深色', value: 'dark' as ThemeMode },
            { label: '自动', value: 'system' as ThemeMode },
          ], settings.theme, handleThemeChange)}
        </View>
      </>)}

      {/* About */}
      {renderSection('安全', <>
        {renderSettingRow(hasPw ? '修改密码' : '设置密码', handlePasswordMenu)}
      </>)}

      {renderSection('关于', <>
        {renderSettingRow('关于 MyDiary', handleAbout)}
        {renderSettingRow('赞助作者', handleSponsor)}
      </>)}

      {/* Export Format Modal */}
      <Modal visible={showExportModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{exportTargetIds ? `导出选中的 ${exportTargetIds.length} 篇日记` : '导出全部日记'}</Text>
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
                <Text style={styles.exportOptionDesc}>支持重新导入</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtnCancel} onPress={() => { setShowExportModal(false); setExportTargetIds(null); }}>
              <Text style={styles.modalBtnCancelText}>取消</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Two-Level Select Modal */}
      <Modal visible={showSelectModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '75%' }]}>
            <Text style={styles.modalTitle}>{selectStep === 'folder' ? '选择性导出' : '选择日记'}</Text>

            {selectStep === 'folder' ? renderFolderSelectView() : renderEntrySelectView()}

            <View style={styles.selectActions}>
              {selectStep === 'entry' && (
                <TouchableOpacity style={styles.selectBtnAll} onPress={handleSelectAll}>
                  <Text style={styles.selectBtnAllText}>{selectedIds.size === getFolderEntries(selectedFolderId!).length ? '取消全选' : '全选'}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.selectBtnExport, selectedIds.size === 0 && { opacity: 0.5 }]}
                onPress={handleConfirmSelect}
                disabled={selectedIds.size === 0}
              >
                <Text style={styles.selectBtnExportText}>导出 ({selectedIds.size})</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowSelectModal(false)}>
              <Text style={styles.modalBtnCancelText}>取消</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Nickname Modal */}
      <Modal visible={showNicknameModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>修改昵称</Text>
            <TextInput style={styles.modalInput} placeholder="输入你的昵称" placeholderTextColor={colors.placeholder} value={nicknameInput} onChangeText={setNicknameInput} maxLength={20} autoFocus />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancelSmall} onPress={() => setShowNicknameModal(false)}>
                <Text style={styles.modalBtnCancelSmallText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnConfirm} onPress={handleSaveNickname}>
                <Text style={styles.modalBtnConfirmText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Password Modal */}
      <Modal visible={showPasswordModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {passwordStep === 'verify' && (
              <>
                <Text style={styles.modalTitle}>验证密码</Text>
                <TextInput style={styles.modalInput} placeholder="输入当前密码" placeholderTextColor={colors.placeholder} value={passwordInput} onChangeText={setPasswordInput} secureTextEntry autoFocus />
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalBtnCancelSmall} onPress={() => setShowPasswordModal(false)}>
                    <Text style={styles.modalBtnCancelSmallText}>取消</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalBtnConfirm} onPress={handleVerifyPassword}>
                    <Text style={styles.modalBtnConfirmText}>验证</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {passwordStep === 'set' && (
              <>
                <Text style={styles.modalTitle}>{hasPw ? '修改密码' : '设置密码'}</Text>
                <TextInput style={styles.modalInput} placeholder="输入新密码（至少4位）" placeholderTextColor={colors.placeholder} value={passwordInput} onChangeText={setPasswordInput} secureTextEntry autoFocus />
                <TextInput style={styles.modalInput} placeholder="确认新密码" placeholderTextColor={colors.placeholder} value={passwordConfirm} onChangeText={setPasswordConfirm} secureTextEntry />
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalBtnCancelSmall} onPress={() => { setShowPasswordModal(false); setPasswordStep('menu'); }}>
                    <Text style={styles.modalBtnCancelSmallText}>取消</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalBtnConfirm} onPress={handleSetPassword}>
                    <Text style={styles.modalBtnConfirmText}>保存</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {passwordStep === 'menu' && (
              <>>
                <Text style={styles.modalTitle}>密码管理</Text>
                <TouchableOpacity style={styles.exportOption} onPress={handleChangePassword}>
                  <MaterialIcons name="lock" size={24} color={colors.primary} />
                  <Text style={styles.exportOptionTitle}>修改密码</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.exportOption} onPress={handleRemovePassword}>
                  <MaterialIcons name="lock-open" size={24} color={colors.danger} />
                  <Text style={[styles.exportOptionTitle, { color: colors.danger }]}>移除密码</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowPasswordModal(false)}>
                  <Text style={styles.modalBtnCancelText}>关闭</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const makeStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  contentContainer: { paddingTop: 40, paddingBottom: 40, alignItems: 'center' },
  avatarWrapper: { marginBottom: 16 },
  avatarCircle: { width: 96, height: 96, borderRadius: 48, borderWidth: 1.5, borderColor: colors.textTertiary, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  avatarInitial: { fontSize: 36, fontWeight: '300', color: colors.textTertiary },
  avatarImage: { width: 96, height: 96, borderRadius: 48 },
  nickname: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 20 },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginBottom: 28,
    width: '100%',
    maxWidth: 320,
    marginHorizontal: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  section: { width: '100%', paddingHorizontal: 24, marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  sectionDiamond: { fontSize: 14, color: colors.textTertiary },
  sectionTitle: { fontSize: 14, fontWeight: '500', color: colors.textSecondary },
  sectionLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  sectionContent: { backgroundColor: colors.card, borderRadius: 12, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline },
  settingRowNoArrow: { paddingHorizontal: 16, paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline },
  settingTitle: { fontSize: 15, color: colors.text },
  chipSection: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline },
  chipLabel: { fontSize: 13, color: colors.textTertiary, marginBottom: 8 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.input },
  chipText: { fontSize: 13, color: colors.textTertiary },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: colors.modalOverlay, justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: colors.card, borderRadius: 16, padding: 24, width: '100%', maxWidth: 360 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8, textAlign: 'center' },
  modalInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: colors.text, backgroundColor: colors.input, marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtnCancelSmall: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: colors.input, alignItems: 'center' },
  modalBtnCancelSmallText: { fontSize: 16, color: colors.textSecondary },
  modalBtnConfirm: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center' },
  modalBtnConfirmText: { fontSize: 16, color: '#fff', fontWeight: '600' },
  modalBtnCancel: { marginTop: 12, paddingVertical: 12, borderRadius: 8, backgroundColor: colors.input, alignItems: 'center' },
  modalBtnCancelText: { fontSize: 16, color: colors.textSecondary },
  // Export options
  exportOption: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline },
  exportOptionText: { flex: 1 },
  exportOptionTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  exportOptionDesc: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
  // Two-level select
  selectModalSubtitle: { fontSize: 13, color: colors.textTertiary, marginBottom: 12, textAlign: 'center' },
  selectBreadcrumb: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  breadcrumbBack: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  breadcrumbText: { fontSize: 14, color: colors.primary },
  breadcrumbSep: { fontSize: 14, color: colors.placeholder },
  breadcrumbCurrent: { fontSize: 14, fontWeight: '600', color: colors.text },
  selectList: { maxHeight: 320 },
  // Folder select row
  folderSelectRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline },
  folderSelectLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  folderSelectName: { fontSize: 15, color: colors.text, flex: 1 },
  folderSelectCount: { fontSize: 12, color: colors.placeholder, marginRight: 4 },
  folderSelectCheck: { padding: 4 },
  // Entry select
  selectItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline },
  selectItemActive: { backgroundColor: colors.input, marginHorizontal: -12, paddingHorizontal: 12, borderRadius: 8 },
  selectItemContent: { flex: 1 },
  selectItemTitle: { fontSize: 15, color: colors.text },
  selectActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  selectBtnAll: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  selectBtnAllText: { fontSize: 14, color: colors.textSecondary },
  selectBtnExport: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center' },
  selectBtnExportText: { fontSize: 14, color: '#fff', fontWeight: '600' },
});

export default MeScreen;

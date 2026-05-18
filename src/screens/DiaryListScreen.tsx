import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { MaterialIcons } from '@expo/vector-icons';
import { v4 as uuidv4 } from 'uuid';
import { RootStackParamList } from '../../App';
import { useDatabase } from '../services/database';
import { useSettings } from '../services/settings';
import { useThemeColors, getFontFamily, ThemeColors } from '../services/theme';
import { DiaryEntry, DiaryFolder } from '../types/diary';
import { exportDiaryEntriesToJson, exportDiaryEntriesToHtml, exportDiaryEntriesToMarkdown, importDiaryEntriesFromJson } from '../utils/export';

type DiaryListScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'DiaryList'>;

const FOLDER_COLORS = ['#007AFF', '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#5856D6', '#AF52DE', '#FF2D55', '#A2845E'];
const FOLDER_ICONS = ['folder', 'school', 'work', 'favorite', 'star', 'home', 'fitness-center', 'music-note', 'brush', 'code'];

const useStyles = (colors: ThemeColors, settings: { fontSize: number; fontFamily: string }) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  searchInput: {
    minHeight: 44,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    margin: 12,
    marginBottom: 0,
    backgroundColor: colors.card,
    fontSize: settings.fontSize,
    fontFamily: getFontFamily(settings.fontFamily),
  },
  folderTabs: {
    maxHeight: 48,
    marginBottom: 4,
  },
  folderTabsContent: {
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
  },
  folderTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.card,
    gap: 4,
  },
  folderTabActive: {
    backgroundColor: colors.selectedBg,
  },
  folderTabText: {
    fontSize: 13,
    color: colors.textTertiary,
    fontFamily: getFontFamily(settings.fontFamily),
  },
  folderTabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  folderTabAdd: {
    paddingHorizontal: 10,
  },
  listContent: {
    paddingBottom: 110,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  entryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 15,
    marginHorizontal: 12,
    marginVertical: 5,
    borderRadius: 8,
    elevation: 2,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  entryItemSelected: {
    backgroundColor: colors.selectedBg,
  },
  checkbox: {
    marginRight: 10,
  },
  entryContent: {
    flex: 1,
    marginRight: 10,
  },
  entryTitle: {
    fontSize: settings.fontSize + 2,
    fontWeight: '700',
    color: colors.text,
    fontFamily: getFontFamily(settings.fontFamily),
  },
  entryDate: {
    fontSize: 12,
    color: colors.placeholder,
    marginTop: 2,
    fontFamily: getFontFamily(settings.fontFamily),
  },
  entryFolder: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
    fontFamily: getFontFamily(settings.fontFamily),
  },
  entrySnippet: {
    fontSize: settings.fontSize - 2,
    color: colors.textSecondary,
    marginTop: 6,
    lineHeight: 20,
    fontFamily: getFontFamily(settings.fontFamily),
  },
  entryTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tag: {
    backgroundColor: colors.tagBg,
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 5,
  },
  entryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinIcon: {
    marginRight: 4,
  },
  entryRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pinBtn: {
    padding: 8,
    minWidth: 36,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  entryUpdatedAt: {
    fontSize: 11,
    color: colors.placeholder,
    marginTop: 6,
    textAlign: 'right',
    opacity: 0.6,
  },
  tagFilterBar: {
    maxHeight: 44,
    marginBottom: 4,
  },
  tagFilterContent: {
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
  },
  tagFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagFilterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tagFilterText: {
    fontSize: 13,
    color: colors.textTertiary,
  },
  tagFilterTextActive: {
    color: '#fff',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: settings.fontSize,
    color: colors.placeholder,
    fontFamily: getFontFamily(settings.fontFamily),
  },
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: colors.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
  selectModeBar: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 10,
  },
  moveBarContent: {
    paddingHorizontal: 12,
    gap: 12,
  },
  moveBarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.background,
    gap: 4,
  },
  moveBarText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: getFontFamily(settings.fontFamily),
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.modalOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: getFontFamily(settings.fontFamily),
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: settings.fontSize,
    marginBottom: 12,
    fontFamily: getFontFamily(settings.fontFamily),
    color: colors.text,
  },
  modalLabel: {
    fontSize: 14,
    color: colors.textTertiary,
    marginBottom: 8,
    fontFamily: getFontFamily(settings.fontFamily),
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: colors.card,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  iconOption: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalButtonCancel: {
    backgroundColor: colors.tagBg,
  },
  modalButtonConfirm: {},
  modalButtonDanger: {
    marginRight: 'auto',
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: getFontFamily(settings.fontFamily),
  },
  modalButtonDangerText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.danger,
    fontFamily: getFontFamily(settings.fontFamily),
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.tagBg,
    borderRadius: 12,
    marginBottom: 10,
    gap: 12,
  },
  exportOptionText: {
    flex: 1,
  },
  exportOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    fontFamily: getFontFamily(settings.fontFamily),
  },
  exportOptionDesc: {
    fontSize: 13,
    color: colors.placeholder,
    marginTop: 2,
    fontFamily: getFontFamily(settings.fontFamily),
  },
});

const DiaryListScreen = () => {
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [folders, setFolders] = useState<DiaryFolder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [activeFolderId, setActiveFolderId] = useState<string | null | undefined>(undefined); // undefined=all, null=unfiled
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<DiaryFolder | null>(null);
  const [folderName, setFolderName] = useState('');
  const [folderColor, setFolderColor] = useState(FOLDER_COLORS[0]);
  const [folderIcon, setFolderIcon] = useState(FOLDER_ICONS[0]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportTargetIds, setExportTargetIds] = useState<string[] | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const database = useDatabase();
  const navigation = useNavigation<DiaryListScreenNavigationProp>();
  const { settings } = useSettings();
  const colors = useThemeColors();

  const styles = useStyles(colors, settings);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const folderList = await database.listFolders();
      setFolders(folderList);

      const entries = searchQuery.trim()
        ? await database.searchEntries(searchQuery, activeFolderId)
        : await database.listEntries(activeFolderId);
      setDiaryEntries(entries);
    } catch (error) {
      console.error('Failed to load data', error);
      Alert.alert('错误', '加载数据失败。');
    } finally {
      setIsLoading(false);
    }
  }, [database, searchQuery, activeFolderId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    const timeoutId = setTimeout(loadData, 300);
    return () => clearTimeout(timeoutId);
  }, [loadData]);

  // Exit select mode when navigating away
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      setIsSelectMode(false);
      setSelectedIds(new Set());
    });
    return unsubscribe;
  }, [navigation]);

  // ==================== Select Mode ====================

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const enterSelectMode = (id: string) => {
    setIsSelectMode(true);
    setSelectedIds(new Set([id]));
  };

  const exitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  };

  const selectAll = () => {
    if (selectedIds.size === diaryEntries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(diaryEntries.map((e) => e.id)));
    }
  };

  const handleBatchDelete = () => {
    const count = selectedIds.size;
    if (count === 0) return;

    Alert.alert('移入回收站', `确定将选中的 ${count} 篇日记移入回收站吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await database.deleteEntries(Array.from(selectedIds));
            exitSelectMode();
            await loadData();
          } catch (error) {
            console.error('Failed to batch delete', error);
            Alert.alert('错误', '删除失败。');
          }
        },
      },
    ]);
  };

  const handleBatchMove = (targetFolderId: string | null) => {
    const count = selectedIds.size;
    if (count === 0) return;

    Alert.alert('移动日记', `将 ${count} 篇日记移到${targetFolderId ? '所选日记夹' : '未分类'}？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '移动',
        onPress: async () => {
          try {
            await database.moveEntriesToFolder(Array.from(selectedIds), targetFolderId);
            exitSelectMode();
            await loadData();
          } catch (error) {
            console.error('Failed to move entries', error);
            Alert.alert('错误', '移动失败。');
          }
        },
      },
    ]);
  };

  // ==================== Folder Management ====================

  const openCreateFolder = () => {
    setEditingFolder(null);
    setFolderName('');
    setFolderColor(FOLDER_COLORS[0]);
    setFolderIcon(FOLDER_ICONS[0]);
    setShowFolderModal(true);
  };

  const openEditFolder = (folder: DiaryFolder) => {
    setEditingFolder(folder);
    setFolderName(folder.name);
    setFolderColor(folder.color);
    setFolderIcon(folder.icon);
    setShowFolderModal(true);
  };

  const saveFolder = async () => {
    if (!folderName.trim()) {
      Alert.alert('提示', '请输入日记夹名称。');
      return;
    }

    try {
      if (editingFolder) {
        await database.updateFolder(editingFolder.id, { name: folderName, color: folderColor, icon: folderIcon });
      } else {
        await database.createFolder(uuidv4(), { name: folderName, color: folderColor, icon: folderIcon });
      }
      setShowFolderModal(false);
      await loadData();
    } catch (error) {
      console.error('Failed to save folder', error);
      Alert.alert('错误', '保存日记夹失败。');
    }
  };

  const deleteFolder = (folder: DiaryFolder) => {
    Alert.alert('删除日记夹', `确定删除「${folder.name}」吗？里面的日记会移到未分类。`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await database.deleteFolder(folder.id);
            if (activeFolderId === folder.id) setActiveFolderId(undefined);
            await loadData();
          } catch (error) {
            console.error('Failed to delete folder', error);
            Alert.alert('错误', '删除日记夹失败。');
          }
        },
      },
    ]);
  };

  // ==================== Export ====================

  const handleExport = (type: 'json' | 'html' | 'md') => {
    setShowExportModal(false);
    const ids = exportTargetIds ?? undefined;
    if (type === 'json') {
      exportDiaryEntriesToJson(database, ids);
    } else if (type === 'html') {
      exportDiaryEntriesToHtml(database, ids);
    } else {
      exportDiaryEntriesToMarkdown(database, ids);
    }
    setExportTargetIds(null);
  };

  const handleSelectiveExport = () => {
    const ids = Array.from(selectedIds);
    setExportTargetIds(ids);
    setShowExportModal(true);
  };

  const handleTogglePin = async (id: string) => {
    try {
      await database.togglePinEntry(id);
      await loadData();
    } catch (error) {
      console.error('Failed to toggle pin', error);
    }
  };

  // Collect all unique tags from entries
  const allTags = React.useMemo(() => {
    const tagSet = new Set<string>();
    diaryEntries.forEach((e) => e.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [diaryEntries]);

  // Filter entries by active tag
  const filteredEntries = React.useMemo(() => {
    if (!activeTag) return diaryEntries;
    return diaryEntries.filter((e) => e.tags.includes(activeTag));
  }, [diaryEntries, activeTag]);

  // ==================== Header ====================

  useEffect(() => {
    if (isSelectMode) {
      navigation.setOptions({
        title: `已选 ${selectedIds.size} 项`,
        headerLeft: () => (
          <TouchableOpacity onPress={exitSelectMode} style={styles.headerButton}>
            <MaterialIcons name="close" size={24} color={colors.primary} />
          </TouchableOpacity>
        ),
        headerRight: () => (
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={selectAll} style={styles.headerButton}>
              <MaterialIcons name="select-all" size={24} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSelectiveExport} style={styles.headerButton}>
              <MaterialIcons name="ios-share" size={24} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleBatchDelete} style={styles.headerButton}>
              <MaterialIcons name="delete" size={24} color={colors.danger} />
            </TouchableOpacity>
          </View>
        ),
      });
    } else {
      navigation.setOptions({
        title: '我的日记',
        headerLeft: undefined,
        headerRight: () => (
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => setShowExportModal(true)} style={styles.headerButton}>
              <MaterialIcons name="ios-share" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ),
      });
    }
  }, [isSelectMode, selectedIds.size, navigation]);

  const handleImport = useCallback(() => {
    Alert.alert('导入日记', '选择要导入的文件格式', [
      { text: '取消', style: 'cancel' },
      {
        text: 'JSON 备份',
        onPress: async () => {
          await importDiaryEntriesFromJson(database);
          await loadData();
        },
      },
      {
        text: 'Markdown',
        onPress: async () => {
          const { importDiaryEntriesFromMarkdown } = await import('../utils/export');
          await importDiaryEntriesFromMarkdown(database);
          await loadData();
        },
      },
    ]);
  }, [database, loadData]);

  // ==================== Render ====================

  const getFolderName = (folderId: string | null) => {
    if (!folderId) return null;
    return folders.find((f) => f.id === folderId)?.name ?? null;
  };

  const renderItem = ({ item }: { item: DiaryEntry }) => {
    const isSelected = selectedIds.has(item.id);

    return (
      <TouchableOpacity
        style={[styles.entryItem, isSelected && styles.entryItemSelected]}
        onPress={() => {
          if (isSelectMode) {
            toggleSelect(item.id);
          } else {
            navigation.navigate('DiaryDetail', { entryId: item.id });
          }
        }}
        onLongPress={() => {
          if (!isSelectMode) {
            enterSelectMode(item.id);
          }
        }}
        delayLongPress={500}
      >
        {isSelectMode && (
          <TouchableOpacity onPress={() => toggleSelect(item.id)} style={styles.checkbox}>
            <MaterialIcons
              name={isSelected ? 'check-box' : 'check-box-outline-blank'}
              size={24}
              color={isSelected ? colors.primary : colors.checkbox}
            />
          </TouchableOpacity>
        )}
        <View style={styles.entryContent}>
          <View style={styles.entryTitleRow}>
            {item.isPinned && <MaterialIcons name="push-pin" size={14} color={colors.primary} style={styles.pinIcon} />}
            <Text style={[styles.entryTitle, { fontSize: settings.fontSize + 2 }]} numberOfLines={1}>{item.title || '无标题'}</Text>
          </View>
          <Text style={styles.entryDate}>{format(new Date(item.updatedAt), 'yyyy年MM月dd日 HH:mm')}</Text>
          {item.folderId && (
            <Text style={styles.entryFolder}>📁 {getFolderName(item.folderId)}</Text>
          )}
          <Text style={[styles.entrySnippet, { fontSize: settings.fontSize - 2 }]} numberOfLines={2}>{item.content || '没有正文'}</Text>
          {item.tags.length > 0 && (
            <View style={styles.entryTags}>
              {item.tags.map((tag) => (
                <Text key={tag} style={styles.tag}>{tag}</Text>
              ))}
            </View>
          )}
          <Text style={styles.entryUpdatedAt}>
            -- {format(new Date(item.updatedAt), 'MM/dd HH:mm')}
          </Text>
        </View>
        {!isSelectMode && (
          <View style={styles.entryRightActions}>
            <TouchableOpacity onPress={() => handleTogglePin(item.id)} style={styles.pinBtn}>
              <MaterialIcons name={item.isPinned ? 'push-pin' : 'push-pin'} size={18} color={item.isPinned ? colors.primary : colors.placeholder} />
            </TouchableOpacity>
            <MaterialIcons name="chevron-right" size={24} color={colors.checkbox} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderFolderTabs = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.folderTabs} contentContainerStyle={styles.folderTabsContent}>
      <TouchableOpacity
        style={[styles.folderTab, activeFolderId === undefined && styles.folderTabActive]}
        onPress={() => setActiveFolderId(undefined)}
      >
        <MaterialIcons name="list" size={18} color={activeFolderId === undefined ? colors.primary : colors.textTertiary} />
        <Text style={[styles.folderTabText, activeFolderId === undefined && styles.folderTabTextActive]}>全部</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.folderTab, activeFolderId === null && styles.folderTabActive]}
        onPress={() => setActiveFolderId(null)}
      >
        <MaterialIcons name="inbox" size={18} color={activeFolderId === null ? colors.primary : colors.textTertiary} />
        <Text style={[styles.folderTabText, activeFolderId === null && styles.folderTabTextActive]}>未分类</Text>
      </TouchableOpacity>
      {folders.map((folder) => (
        <TouchableOpacity
          key={folder.id}
          style={[styles.folderTab, activeFolderId === folder.id && styles.folderTabActive]}
          onPress={() => setActiveFolderId(folder.id)}
          onLongPress={() => openEditFolder(folder)}
        >
          <MaterialIcons name={folder.icon as any} size={18} color={folder.color} />
          <Text style={[styles.folderTabText, { color: folder.color }]}>{folder.name}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={[styles.folderTab, styles.folderTabAdd]} onPress={openCreateFolder}>
        <MaterialIcons name="add" size={18} color={colors.checkbox} />
      </TouchableOpacity>
    </ScrollView>
  );

  // ==================== Folder Modal ====================

  const renderFolderModal = () => (
    <Modal visible={showFolderModal} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{editingFolder ? '编辑日记夹' : '新建日记夹'}</Text>

          <TextInput
            style={styles.modalInput}
            placeholder="日记夹名称"
            placeholderTextColor={colors.placeholder}
            value={folderName}
            onChangeText={setFolderName}
          />

          <Text style={styles.modalLabel}>颜色</Text>
          <View style={styles.colorGrid}>
            {FOLDER_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.colorOption, { backgroundColor: c }, folderColor === c && styles.colorOptionSelected]}
                onPress={() => setFolderColor(c)}
              />
            ))}
          </View>

          <Text style={styles.modalLabel}>图标</Text>
          <View style={styles.iconGrid}>
            {FOLDER_ICONS.map((ic) => (
              <TouchableOpacity
                key={ic}
                style={[styles.iconOption, folderIcon === ic && { backgroundColor: folderColor + '20' }]}
                onPress={() => setFolderIcon(ic)}
              >
                <MaterialIcons name={ic as any} size={22} color={folderIcon === ic ? folderColor : colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.modalActions}>
            {editingFolder && (
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDanger]}
                onPress={() => {
                  setShowFolderModal(false);
                  deleteFolder(editingFolder);
                }}
              >
                <Text style={styles.modalButtonDangerText}>删除</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.modalButton, styles.modalButtonCancel]} onPress={() => setShowFolderModal(false)}>
              <Text style={styles.modalButtonText}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, styles.modalButtonConfirm, { backgroundColor: folderColor }]} onPress={saveFolder}>
              <Text style={[styles.modalButtonText, { color: '#fff' }]}>保存</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // ==================== Export Modal ====================

  const renderExportModal = () => (
    <Modal visible={showExportModal} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{exportTargetIds ? `导出选中的 ${exportTargetIds.length} 篇日记` : '导出日记'}</Text>

          <TouchableOpacity style={styles.exportOption} onPress={() => handleExport('json')}>
            <MaterialIcons name="code" size={28} color={colors.primary} />
            <View style={styles.exportOptionText}>
              <Text style={styles.exportOptionTitle}>JSON 备份</Text>
              <Text style={styles.exportOptionDesc}>完整数据备份，可重新导入</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.exportOption} onPress={() => handleExport('html')}>
            <MaterialIcons name="web" size={28} color="#34C759" />
            <View style={styles.exportOptionText}>
              <Text style={styles.exportOptionTitle}>网页 HTML</Text>
              <Text style={styles.exportOptionDesc}>精美排版，可在浏览器查看或打印</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.exportOption} onPress={() => handleExport('md')}>
            <MaterialIcons name="description" size={28} color="#5856D6" />
            <View style={styles.exportOptionText}>
              <Text style={styles.exportOptionTitle}>Markdown</Text>
              <Text style={styles.exportOptionDesc}>保留格式标记，支持重新导入</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.modalButton, styles.modalButtonCancel, { marginTop: 12 }]} onPress={() => { setShowExportModal(false); setExportTargetIds(null); }}>
            <Text style={styles.modalButtonText}>取消</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // ==================== Move Mode Bottom Bar ====================

  const renderSelectModeBar = () => {
    if (!isSelectMode) return null;

    return (
      <View style={styles.selectModeBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moveBarContent}>
          <TouchableOpacity style={styles.moveBarItem} onPress={() => handleBatchMove(null)}>
            <MaterialIcons name="inbox" size={20} color={colors.textTertiary} />
            <Text style={styles.moveBarText}>未分类</Text>
          </TouchableOpacity>
          {folders.map((folder) => (
            <TouchableOpacity key={folder.id} style={styles.moveBarItem} onPress={() => handleBatchMove(folder.id)}>
              <MaterialIcons name={folder.icon as any} size={20} color={folder.color} />
              <Text style={styles.moveBarText}>{folder.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {!isSelectMode && (
        <TextInput
          style={styles.searchInput}
          placeholder="搜索标题、正文或标签"
          placeholderTextColor={colors.placeholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
      )}
      {renderFolderTabs()}
      {allTags.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagFilterBar} contentContainerStyle={styles.tagFilterContent}>
          <TouchableOpacity
            style={[styles.tagFilterChip, !activeTag && styles.tagFilterChipActive]}
            onPress={() => setActiveTag(null)}
          >
            <Text style={[styles.tagFilterText, !activeTag && styles.tagFilterTextActive]}>全部标签</Text>
          </TouchableOpacity>
          {allTags.map((tag) => (
            <TouchableOpacity
              key={tag}
              style={[styles.tagFilterChip, activeTag === tag && styles.tagFilterChipActive]}
              onPress={() => setActiveTag(activeTag === tag ? null : tag)}
            >
              <Text style={[styles.tagFilterText, activeTag === tag && styles.tagFilterTextActive]}>#{tag}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      <FlatList
        data={filteredEntries}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshing={isLoading}
        onRefresh={loadData}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={filteredEntries.length === 0 ? styles.emptyList : styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {searchQuery.trim() ? '没有匹配的日记。' : activeFolderId !== undefined ? '这个日记夹里还没有日记。' : activeTag ? `没有标签为「${activeTag}」的日记。` : '还没有日记，点右下角开始记录。'}
          </Text>
        }
      />
      {renderSelectModeBar()}
      {!isSelectMode && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('DiaryDetail', { entryId: undefined, folderId: activeFolderId && activeFolderId !== null ? activeFolderId : undefined })}
          accessibilityLabel="新建日记"
        >
          <MaterialIcons name="add" size={30} color="white" />
        </TouchableOpacity>
      )}
      {renderFolderModal()}
      {renderExportModal()}
    </View>
  );
};

export default DiaryListScreen;

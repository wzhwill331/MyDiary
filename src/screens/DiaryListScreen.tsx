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
import { DiaryEntry, DiaryFolder } from '../types/diary';
import { exportDiaryEntriesToJson, exportDiaryEntriesToHtml, importDiaryEntriesFromJson } from '../utils/export';

type DiaryListScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'DiaryList'>;

const FOLDER_COLORS = ['#007AFF', '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#5856D6', '#AF52DE', '#FF2D55', '#A2845E'];
const FOLDER_ICONS = ['folder', 'school', 'work', 'favorite', 'star', 'home', 'fitness-center', 'music-note', 'brush', 'code'];

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

  const database = useDatabase();
  const navigation = useNavigation<DiaryListScreenNavigationProp>();

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

    Alert.alert('批量删除', `确定删除选中的 ${count} 篇日记吗？`, [
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

  const handleExport = (type: 'json' | 'html') => {
    setShowExportModal(false);
    if (type === 'json') {
      exportDiaryEntriesToJson(database);
    } else {
      exportDiaryEntriesToHtml(database);
    }
  };

  // ==================== Header ====================

  useEffect(() => {
    if (isSelectMode) {
      navigation.setOptions({
        title: `已选 ${selectedIds.size} 项`,
        headerLeft: () => (
          <TouchableOpacity onPress={exitSelectMode} style={styles.headerButton}>
            <MaterialIcons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
        ),
        headerRight: () => (
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={selectAll} style={styles.headerButton}>
              <MaterialIcons name="select-all" size={24} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleBatchDelete} style={styles.headerButton}>
              <MaterialIcons name="delete" size={24} color="#FF3B30" />
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
            <TouchableOpacity onPress={handleImport} style={styles.headerButton}>
              <MaterialIcons name="file-upload" size={24} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowExportModal(true)} style={styles.headerButton}>
              <MaterialIcons name="ios-share" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>
        ),
      });
    }
  }, [isSelectMode, selectedIds.size, navigation]);

  const handleImport = useCallback(async () => {
    await importDiaryEntriesFromJson(database);
    await loadData();
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
              color={isSelected ? '#007AFF' : '#999'}
            />
          </TouchableOpacity>
        )}
        <View style={styles.entryContent}>
          <Text style={styles.entryTitle} numberOfLines={1}>{item.title || '无标题'}</Text>
          <Text style={styles.entryDate}>{format(new Date(item.updatedAt), 'yyyy年MM月dd日 HH:mm')}</Text>
          {item.folderId && (
            <Text style={styles.entryFolder}>📁 {getFolderName(item.folderId)}</Text>
          )}
          <Text style={styles.entrySnippet} numberOfLines={2}>{item.content || '没有正文'}</Text>
          {item.tags.length > 0 && (
            <View style={styles.entryTags}>
              {item.tags.map((tag) => (
                <Text key={tag} style={styles.tag}>{tag}</Text>
              ))}
            </View>
          )}
        </View>
        {!isSelectMode && <MaterialIcons name="chevron-right" size={24} color="#999" />}
      </TouchableOpacity>
    );
  };

  const renderFolderTabs = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.folderTabs} contentContainerStyle={styles.folderTabsContent}>
      <TouchableOpacity
        style={[styles.folderTab, activeFolderId === undefined && styles.folderTabActive]}
        onPress={() => setActiveFolderId(undefined)}
      >
        <MaterialIcons name="list" size={18} color={activeFolderId === undefined ? '#007AFF' : '#666'} />
        <Text style={[styles.folderTabText, activeFolderId === undefined && styles.folderTabTextActive]}>全部</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.folderTab, activeFolderId === null && styles.folderTabActive]}
        onPress={() => setActiveFolderId(null)}
      >
        <MaterialIcons name="inbox" size={18} color={activeFolderId === null ? '#007AFF' : '#666'} />
        <Text style={[styles.folderTabText, activeFolderId === null && styles.folderTabTextActive]}>未分类</Text>
      </TouchableOpacity>
      {folders.map((folder) => (
        <TouchableOpacity
          key={folder.id}
          style={[styles.folderTab, activeFolderId === folder.id && styles.folderTabActive]}
          onPress={() => setActiveFolderId(folder.id)}
          onLongPress={() => openEditFolder(folder)}
        >
          <MaterialIcons name={folder.icon as any} size={18} color={activeFolderId === folder.id ? folder.color : '#666'} />
          <Text style={[styles.folderTabText, activeFolderId === folder.id && { color: folder.color }]}>{folder.name}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={[styles.folderTab, styles.folderTabAdd]} onPress={openCreateFolder}>
        <MaterialIcons name="add" size={18} color="#999" />
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
                <MaterialIcons name={ic as any} size={22} color={folderIcon === ic ? folderColor : '#666'} />
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
          <Text style={styles.modalTitle}>导出日记</Text>

          <TouchableOpacity style={styles.exportOption} onPress={() => handleExport('json')}>
            <MaterialIcons name="code" size={28} color="#007AFF" />
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

          <TouchableOpacity style={[styles.modalButton, styles.modalButtonCancel, { marginTop: 12 }]} onPress={() => setShowExportModal(false)}>
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
            <MaterialIcons name="inbox" size={20} color="#666" />
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
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
      )}
      {renderFolderTabs()}
      <FlatList
        data={diaryEntries}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshing={isLoading}
        onRefresh={loadData}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={diaryEntries.length === 0 ? styles.emptyList : styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {searchQuery.trim() ? '没有匹配的日记。' : activeFolderId !== undefined ? '这个日记夹里还没有日记。' : '还没有日记，点右下角开始记录。'}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f5f7',
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
    borderColor: '#d8dbe0',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    margin: 12,
    marginBottom: 0,
    backgroundColor: '#fff',
    fontSize: 16,
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
    backgroundColor: '#fff',
    gap: 4,
  },
  folderTabActive: {
    backgroundColor: '#e8f0fe',
  },
  folderTabText: {
    fontSize: 13,
    color: '#666',
  },
  folderTabTextActive: {
    color: '#007AFF',
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
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 12,
    marginVertical: 5,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  entryItemSelected: {
    backgroundColor: '#e8f0fe',
  },
  checkbox: {
    marginRight: 10,
  },
  entryContent: {
    flex: 1,
    marginRight: 10,
  },
  entryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
  },
  entryDate: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  entryFolder: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  entrySnippet: {
    fontSize: 14,
    color: '#555',
    marginTop: 6,
    lineHeight: 20,
  },
  entryTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tag: {
    backgroundColor: '#eef1f4',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 5,
    marginBottom: 5,
    fontSize: 12,
    color: '#555',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#888',
  },
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: '#007AFF',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
  selectModeBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
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
    backgroundColor: '#f4f5f7',
    gap: 4,
  },
  moveBarText: {
    fontSize: 13,
    color: '#333',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#d8dbe0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
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
    borderColor: '#fff',
    shadowColor: '#000',
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
    backgroundColor: '#f0f0f0',
  },
  modalButtonConfirm: {},
  modalButtonDanger: {
    marginRight: 'auto',
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  modalButtonDangerText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF3B30',
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
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
    color: '#222',
  },
  exportOptionDesc: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
});

export default DiaryListScreen;

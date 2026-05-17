import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { v4 as uuidv4 } from 'uuid';
import { RootStackParamList } from '../../App';
import { useDatabase } from '../services/database';
import { DiaryFolder } from '../types/diary';
import { exportSingleEntryToHtml, shareDiaryAsImage, saveDiaryImageToAlbum } from '../utils/export';
import DiaryCard from '../components/DiaryCard';

type DiaryDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'DiaryDetail'>;

const parseTags = (value: string) =>
  value
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter(Boolean);

const DiaryDetailScreen = ({ route, navigation }: DiaryDetailScreenProps) => {
  const entryId = route.params?.entryId;
  const presetFolderId = route.params?.folderId;
  const database = useDatabase();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [folderId, setFolderId] = useState<string | null>(presetFolderId ?? null);
  const [folders, setFolders] = useState<DiaryFolder[]>([]);
  const [originalSnapshot, setOriginalSnapshot] = useState({ title: '', content: '', tagsText: '', folderId: null as string | null });
  const [isSaving, setIsSaving] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const cardRef = useRef<View>(null) as React.MutableRefObject<View>;

  const hasUnsavedChanges =
    title !== originalSnapshot.title ||
    content !== originalSnapshot.content ||
    tagsText !== originalSnapshot.tagsText ||
    folderId !== originalSnapshot.folderId;

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      // Load folders
      try {
        const folderList = await database.listFolders();
        if (mounted) setFolders(folderList);
      } catch (error) {
        console.error('Failed to load folders', error);
      }

      // Load entry if editing
      if (!entryId) {
        navigation.setOptions({ title: '新建日记' });
        return;
      }

      try {
        const entry = await database.getEntryById(entryId);
        if (!mounted || !entry) return;

        const nextSnapshot = {
          title: entry.title,
          content: entry.content,
          tagsText: entry.tags.join(', '),
          folderId: entry.folderId,
        };
        setTitle(nextSnapshot.title);
        setContent(nextSnapshot.content);
        setTagsText(nextSnapshot.tagsText);
        setFolderId(nextSnapshot.folderId);
        setOriginalSnapshot(nextSnapshot);
        navigation.setOptions({ title: '编辑日记' });
      } catch (error) {
        console.error('Failed to load diary entry', error);
        Alert.alert('错误', '加载日记失败。');
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [database, entryId, navigation]);

  const handleBack = useCallback(() => {
    if (!hasUnsavedChanges) {
      navigation.goBack();
      return;
    }

    Alert.alert('放弃修改？', '当前日记还没有保存。', [
      { text: '继续编辑', style: 'cancel' },
      { text: '放弃', style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  }, [hasUnsavedChanges, navigation]);

  const handleSave = useCallback(async () => {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle && !trimmedContent) {
      Alert.alert('提示', '标题和正文不能都为空。');
      return;
    }

    try {
      setIsSaving(true);
      const input = {
        title: trimmedTitle,
        content: trimmedContent,
        tags: parseTags(tagsText),
        folderId,
      };

      if (entryId) {
        await database.updateEntry(entryId, input);
      } else {
        await database.createEntry(uuidv4(), input);
      }

      setOriginalSnapshot({ title: trimmedTitle, content: trimmedContent, tagsText, folderId });
      navigation.goBack();
    } catch (error) {
      console.error('Failed to save diary entry', error);
      Alert.alert('错误', '保存日记失败。');
    } finally {
      setIsSaving(false);
    }
  }, [content, database, entryId, folderId, navigation, tagsText, title]);

  const handleShare = useCallback(async () => {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!trimmedTitle && !trimmedContent) {
      Alert.alert('提示', '没有内容可以分享。');
      return;
    }

    setShowExportModal(true);
  }, [content, title]);

  const handleExportHtml = useCallback(async () => {
    setShowExportModal(false);
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    const folderName = folderId ? folders.find((f) => f.id === folderId)?.name : undefined;
    await exportSingleEntryToHtml(
      {
        id: entryId || '',
        title: trimmedTitle,
        content: trimmedContent,
        folderId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: parseTags(tagsText),
      },
      folderName
    );
  }, [content, entryId, folderId, folders, tagsText, title]);

  const handleExportImage = useCallback(async () => {
    setShowExportModal(false);
    if (!cardRef.current) return;
    await shareDiaryAsImage(cardRef);
  }, []);

  const handleSaveToAlbum = useCallback(async () => {
    setShowExportModal(false);
    if (!cardRef.current) return;
    await saveDiaryImageToAlbum(cardRef);
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={handleBack} style={styles.headerButton} accessibilityLabel="返回">
          <MaterialIcons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShare} style={styles.headerButton} accessibilityLabel="分享">
            <MaterialIcons name="share" size={22} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} style={styles.headerButton} disabled={isSaving} accessibilityLabel="保存日记">
            <MaterialIcons name="save" size={24} color={isSaving ? '#9bbce0' : '#007AFF'} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [handleBack, handleSave, handleShare, isSaving, navigation]);

  const currentFolder = folderId ? folders.find((f) => f.id === folderId) : null;
  const currentFolderName = currentFolder?.name || '未分类';

  const currentEntry = {
    id: entryId || '',
    title: title.trim(),
    content: content.trim(),
    folderId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: parseTags(tagsText),
  };

  return (
    <View style={styles.container}>
      {/* Hidden DiaryCard for image capture */}
      <View style={styles.hiddenCard} pointerEvents="none">
        <DiaryCard ref={cardRef} entry={currentEntry} folder={currentFolder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Folder selector */}
        <TouchableOpacity style={styles.folderSelector} onPress={() => setShowFolderPicker(!showFolderPicker)}>
          <MaterialIcons
            name={folderId ? (folders.find((f) => f.id === folderId)?.icon as any) || 'folder' : 'inbox'}
            size={18}
            color={folderId ? folders.find((f) => f.id === folderId)?.color || '#007AFF' : '#999'}
          />
          <Text style={styles.folderSelectorText}>{currentFolderName}</Text>
          <MaterialIcons name={showFolderPicker ? 'expand-less' : 'expand-more'} size={20} color="#999" />
        </TouchableOpacity>

        {showFolderPicker && (
          <View style={styles.folderPicker}>
            <TouchableOpacity
              style={[styles.folderPickerItem, folderId === null && styles.folderPickerItemActive]}
              onPress={() => { setFolderId(null); setShowFolderPicker(false); }}
            >
              <MaterialIcons name="inbox" size={18} color="#999" />
              <Text style={styles.folderPickerText}>未分类</Text>
              {folderId === null && <MaterialIcons name="check" size={18} color="#007AFF" />}
            </TouchableOpacity>
            {folders.map((f) => (
              <TouchableOpacity
                key={f.id}
                style={[styles.folderPickerItem, folderId === f.id && styles.folderPickerItemActive]}
                onPress={() => { setFolderId(f.id); setShowFolderPicker(false); }}
              >
                <MaterialIcons name={f.icon as any} size={18} color={f.color} />
                <Text style={styles.folderPickerText}>{f.name}</Text>
                {folderId === f.id && <MaterialIcons name="check" size={18} color="#007AFF" />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TextInput
          style={styles.titleInput}
          placeholder="标题（可选）"
          value={title}
          onChangeText={setTitle}
          editable={!isSaving}
        />
        <TextInput
          style={styles.contentInput}
          placeholder="记录你的思绪..."
          value={content}
          onChangeText={setContent}
          editable={!isSaving}
          multiline
          textAlignVertical="top"
        />
        <TextInput
          style={styles.tagsInput}
          placeholder="标签（逗号分隔，如：生活 感悟）"
          value={tagsText}
          onChangeText={setTagsText}
          editable={!isSaving}
        />
      </ScrollView>

      {/* Export Modal */}
      <Modal visible={showExportModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>导出日记</Text>

            <TouchableOpacity style={styles.exportOption} onPress={handleExportImage}>
              <MaterialIcons name="image" size={28} color="#FF9500" />
              <View style={styles.exportOptionText}>
                <Text style={styles.exportOptionTitle}>分享图片</Text>
                <Text style={styles.exportOptionDesc}>生成精美卡片，发送给朋友</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.exportOption} onPress={handleSaveToAlbum}>
              <MaterialIcons name="save-alt" size={28} color="#34C759" />
              <View style={styles.exportOptionText}>
                <Text style={styles.exportOptionTitle}>保存到相册</Text>
                <Text style={styles.exportOptionDesc}>将日记卡片保存为图片到手机相册</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.exportOption} onPress={handleExportHtml}>
              <MaterialIcons name="web" size={28} color="#007AFF" />
              <View style={styles.exportOptionText}>
                <Text style={styles.exportOptionTitle}>导出网页</Text>
                <Text style={styles.exportOptionDesc}>导出 HTML 文件，可在浏览器查看</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel, { marginTop: 12 }]}
              onPress={() => setShowExportModal(false)}
            >
              <Text style={styles.modalButtonText}>取消</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  folderSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  folderSelectorText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  folderPicker: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  folderPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
  },
  folderPickerItemActive: {
    backgroundColor: '#f0f7ff',
  },
  folderPickerText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  titleInput: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eceff3',
    color: '#222',
  },
  contentInput: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 280,
    marginBottom: 16,
    color: '#333',
  },
  tagsInput: {
    fontSize: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eceff3',
    borderBottomWidth: 1,
    borderBottomColor: '#eceff3',
    color: '#444',
  },
  hiddenCard: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    opacity: 0,
  },
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
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f0f0f0',
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
});

export default DiaryDetailScreen;

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Alert, Image, Keyboard, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { MaterialIcons } from '@expo/vector-icons';
import { v4 as uuidv4 } from 'uuid';
import { RootStackParamList } from '../../App';
import { useDatabase } from '../services/database';
import { useSettings } from '../services/settings';
import { useThemeColors, getFontFamily, ThemeColors } from '../services/theme';
import * as ImagePicker from 'expo-image-picker';
import { DiaryFolder, MOOD_OPTIONS } from '../types/diary';
import { exportSingleEntryToHtml, shareDiaryAsImage, saveDiaryImageToAlbum } from '../utils/export';
import DiaryCard from '../components/DiaryCard';

type DiaryDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'DiaryDetail'>;

const parseTags = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return [];
  // Support #tag format: #生活#日常 or #生活 #日常
  if (trimmed.includes('#')) {
    return trimmed.split('#').map((t) => t.trim()).filter(Boolean);
  }
  // Fallback: comma separated
  return trimmed.split(/[,，]/).map((t) => t.trim()).filter(Boolean);
};

const useStyles = (colors: ThemeColors, settings: { fontSize: number; fontFamily: string }) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    backgroundColor: colors.tagBg,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  folderSelectorText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: getFontFamily(settings.fontFamily),
  },
  folderPicker: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
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
    borderBottomColor: colors.hairline,
  },
  folderPickerItemActive: {
    backgroundColor: colors.selectedBg,
  },
  folderPickerText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: getFontFamily(settings.fontFamily),
  },
  titleInput: {
    fontSize: settings.fontSize + 8,
    fontWeight: '700',
    marginBottom: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
    color: colors.text,
    fontFamily: getFontFamily(settings.fontFamily),
  },
  contentInput: {
    fontSize: settings.fontSize,
    lineHeight: 24,
    minHeight: 280,
    marginBottom: 16,
    color: colors.textSecondary,
    fontFamily: getFontFamily(settings.fontFamily),
  },
  moodSelector: {
    marginBottom: 12,
  },
  moodSelectorContent: {
    gap: 8,
    paddingVertical: 4,
  },
  moodButton: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
    minWidth: 56,
  },
  moodEmoji: {
    fontSize: 24,
  },
  moodLabel: {
    fontSize: 11,
    color: colors.placeholder,
    marginTop: 2,
    fontFamily: getFontFamily(settings.fontFamily),
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  imageThumb: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  imageThumbImg: {
    width: '100%',
    height: '100%',
  },
  imageRemoveBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  addImageText: {
    fontSize: 14,
    fontFamily: getFontFamily(settings.fontFamily),
  },
  tagsInput: {
    fontSize: settings.fontSize - 2,
    paddingVertical: 12,
    paddingHorizontal: 0,
    minHeight: 44,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
    color: colors.text,
    fontFamily: getFontFamily(settings.fontFamily),
  },
  updatedAtLabel: {
    fontSize: 11,
    color: colors.placeholder,
    textAlign: 'right',
    opacity: 0.6,
    marginTop: 4,
    marginBottom: 8,
  },
  hiddenCard: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    opacity: 0,
  },
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
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.tagBg,
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: getFontFamily(settings.fontFamily),
  },
});

const DiaryDetailScreen = ({ route, navigation }: DiaryDetailScreenProps) => {
  const entryId = route.params?.entryId;
  const presetFolderId = route.params?.folderId;
  const database = useDatabase();
  const { settings } = useSettings();
  const colors = useThemeColors();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [folderId, setFolderId] = useState<string | null>(presetFolderId ?? null);
  const [folders, setFolders] = useState<DiaryFolder[]>([]);
  const [originalSnapshot, setOriginalSnapshot] = useState({ title: '', content: '', tagsText: '', folderId: null as string | null, mood: null as string | null, imageUris: [] as string[] });
  const [loadedUpdatedAt, setLoadedUpdatedAt] = useState<string | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [mood, setMood] = useState<string | null>(null);
  const [imageUris, setImageUris] = useState<string[]>([]);
  const cardRef = useRef<View>(null) as React.MutableRefObject<View>;
  const formRef = useRef({ title: '', content: '', tagsText: '', folderId: null as string | null, mood: null as string | null, imageUris: [] as string[] });
  const scrollRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);
  formRef.current = { title, content, tagsText, folderId, mood, imageUris };

  const styles = useStyles(colors, settings);

  const hasUnsavedChanges =
    title !== originalSnapshot.title ||
    content !== originalSnapshot.content ||
    tagsText !== originalSnapshot.tagsText ||
    folderId !== originalSnapshot.folderId ||
    mood !== originalSnapshot.mood ||
    JSON.stringify(imageUris) !== JSON.stringify(originalSnapshot.imageUris);

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
        setLoadedUpdatedAt(new Date().toISOString());
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
          mood: entry.mood ?? null,
          imageUris: entry.imageUris ?? [],
        };
        setTitle(nextSnapshot.title);
        setContent(nextSnapshot.content);
        setTagsText(nextSnapshot.tagsText);
        setFolderId(nextSnapshot.folderId);
        setMood(nextSnapshot.mood);
        setImageUris(nextSnapshot.imageUris);
        setOriginalSnapshot(nextSnapshot);
        setLoadedUpdatedAt(entry.updatedAt);
        setIsPinned(entry.isPinned ?? false);
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

    Alert.alert('未保存的修改', '当前日记还没有保存。', [
      { text: '继续编辑', style: 'cancel' },
      { text: '不保存', style: 'destructive', onPress: () => navigation.goBack() },
      { text: '保存', onPress: () => handleSave() },
    ]);
  }, [hasUnsavedChanges, navigation, handleSave]);

  // 拦截全面屏手势返回和物理返回键
  const pendingActionRef = useRef<any>(null);
  const justSavedRef = useRef(false);

  // Reset justSavedRef when entering the screen
  useEffect(() => {
    justSavedRef.current = false;
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!hasUnsavedChanges || justSavedRef.current) {
        return; // 没修改或刚保存，正常退出
      }

      // 阻止默认退出行为
      e.preventDefault();

      // 保存要执行的 action，等保存完成后再 dispatch
      pendingActionRef.current = e.data.action;

      Alert.alert('未保存的修改', '当前日记还没有保存。', [
        { text: '继续编辑', style: 'cancel', onPress: () => { pendingActionRef.current = null; } },
        { text: '不保存', style: 'destructive', onPress: () => {
          const action = pendingActionRef.current;
          pendingActionRef.current = null;
          if (action) navigation.dispatch(action);
        }},
        { text: '保存', onPress: () => handleSaveAndExit() },
      ]);
    });

    return unsubscribe;
  }, [hasUnsavedChanges, navigation, handleSave]);

  const handleSaveAndExit = useCallback(async () => {
    const form = formRef.current;
    const trimmedTitle = form.title.trim();
    const trimmedContent = form.content.trim();

    if (!trimmedTitle && !trimmedContent) {
      Alert.alert('提示', '标题和正文不能都为空。');
      pendingActionRef.current = null;
      return;
    }

    try {
      setIsSaving(true);
      const input = {
        title: trimmedTitle,
        content: trimmedContent,
        tags: parseTags(form.tagsText),
        folderId: form.folderId,
        mood: form.mood,
        imageUris: form.imageUris,
      };

      if (entryId) {
        await database.updateEntry(entryId, input);
      } else {
        await database.createEntry(uuidv4(), input);
      }

      const action = pendingActionRef.current;
      pendingActionRef.current = null;
      justSavedRef.current = true;
      setIsSaving(false);
      if (action) navigation.dispatch(action);
    } catch (error) {
      console.error('Failed to save diary entry', error);
      Alert.alert('错误', '保存日记失败。');
      pendingActionRef.current = null;
      setIsSaving(false);
    }
  }, [database, entryId, navigation]);

  const handleSave = useCallback(async () => {
    const form = formRef.current;
    const trimmedTitle = form.title.trim();
    const trimmedContent = form.content.trim();

    if (!trimmedTitle && !trimmedContent) {
      Alert.alert('提示', '标题和正文不能都为空。');
      return;
    }

    try {
      setIsSaving(true);
      const input = {
        title: trimmedTitle,
        content: trimmedContent,
        tags: parseTags(form.tagsText),
        folderId: form.folderId,
        mood: form.mood,
        imageUris: form.imageUris,
      };

      if (entryId) {
        await database.updateEntry(entryId, input);
      } else {
        const newEntry = await database.createEntry(uuidv4(), input);
        navigation.setParams({ entryId: newEntry.id } as any);
      }

      setOriginalSnapshot({ title: trimmedTitle, content: trimmedContent, tagsText: form.tagsText, folderId: form.folderId, mood: form.mood, imageUris: form.imageUris });
      Alert.alert('已保存', '日记保存成功。');
    } catch (error) {
      console.error('Failed to save diary entry', error);
      Alert.alert('错误', '保存日记失败。');
    } finally {
      setIsSaving(false);
    }
  }, [database, entryId, navigation]);

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
    mood,
    imageUris,
      },
      folderName
    );
  }, [content, entryId, folderId, folders, mood, imageUris, tagsText, title]);

  const handleExportImage = useCallback(async () => {
    setShowExportModal(false);
    if (!cardRef.current) return;
    await shareDiaryAsImage(cardRef);
  }, []);

  const handleAddImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 9 - imageUris.length,
    });
    if (!result.canceled && result.assets) {
      setImageUris((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 9));
    }
  }, [imageUris.length]);

  const handleRemoveImage = useCallback((index: number) => {
    setImageUris((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleTogglePin = useCallback(async () => {
    if (!entryId) return;
    try {
      await database.togglePinEntry(entryId);
      setIsPinned(!isPinned);
    } catch (error) {
      console.error('Failed to toggle pin', error);
    }
  }, [entryId, database, isPinned]);

  const handleSaveToAlbum = useCallback(async () => {
    setShowExportModal(false);
    if (!cardRef.current) return;
    await saveDiaryImageToAlbum(cardRef);
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={handleBack} style={styles.headerButton} accessibilityLabel="返回">
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleTogglePin} style={styles.headerButton} accessibilityLabel="置顶">
            <MaterialIcons name="push-pin" size={22} color={isPinned ? colors.primary : colors.placeholder} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={styles.headerButton} accessibilityLabel="分享">
            <MaterialIcons name="share" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} style={styles.headerButton} disabled={isSaving} accessibilityLabel="保存日记">
            <MaterialIcons name="save" size={24} color={isSaving ? colors.placeholder : colors.primary} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [handleBack, handleSave, handleShare, handleTogglePin, isPinned, isSaving, navigation]);

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
    mood: mood ?? undefined,
    imageUris: imageUris.length > 0 ? imageUris : undefined,
  };

  return (
    <View style={styles.container}>
      {/* Hidden DiaryCard for image capture */}
      <View style={styles.hiddenCard} pointerEvents="none">
        <DiaryCard ref={cardRef} entry={currentEntry} avatarUri={settings.avatarUri} nickname={settings.nickname} />
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={[styles.scrollContent, { paddingBottom: keyboardHeight + 32 }]} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
        {/* Folder selector */}
        <TouchableOpacity style={styles.folderSelector} onPress={() => setShowFolderPicker(!showFolderPicker)}>
          <MaterialIcons
            name={folderId ? (folders.find((f) => f.id === folderId)?.icon as any) || 'folder' : 'inbox'}
            size={18}
            color={folderId ? folders.find((f) => f.id === folderId)?.color || colors.primary : colors.checkbox}
          />
          <Text style={styles.folderSelectorText}>{currentFolderName}</Text>
          <MaterialIcons name={showFolderPicker ? 'expand-less' : 'expand-more'} size={20} color={colors.checkbox} />
        </TouchableOpacity>

        {showFolderPicker && (
          <View style={styles.folderPicker}>
            <TouchableOpacity
              style={[styles.folderPickerItem, folderId === null && styles.folderPickerItemActive]}
              onPress={() => { setFolderId(null); setShowFolderPicker(false); }}
            >
              <MaterialIcons name="inbox" size={18} color={colors.checkbox} />
              <Text style={styles.folderPickerText}>未分类</Text>
              {folderId === null && <MaterialIcons name="check" size={18} color={colors.primary} />}
            </TouchableOpacity>
            {folders.map((f) => (
              <TouchableOpacity
                key={f.id}
                style={[styles.folderPickerItem, folderId === f.id && styles.folderPickerItemActive]}
                onPress={() => { setFolderId(f.id); setShowFolderPicker(false); }}
              >
                <MaterialIcons name={f.icon as any} size={18} color={f.color} />
                <Text style={styles.folderPickerText}>{f.name}</Text>
                {folderId === f.id && <MaterialIcons name="check" size={18} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TextInput
          style={styles.titleInput}
          placeholder="标题（可选）"
          placeholderTextColor={colors.placeholder}
          value={title}
          onChangeText={setTitle}
          editable={!isSaving}
          blurOnSubmit={false}
          onFocus={() => setIsEditing(true)}
          onBlur={() => setIsEditing(false)}
        />
        {/* Mood selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.moodSelector} contentContainerStyle={styles.moodSelectorContent}>
          {MOOD_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.emoji}
              style={[styles.moodButton, mood === option.emoji && { backgroundColor: option.color + '40', borderColor: option.color }]}
              onPress={() => setMood(mood === option.emoji ? null : option.emoji)}
              activeOpacity={0.7}
            >
              <Text style={styles.moodEmoji}>{option.emoji}</Text>
              <Text style={[styles.moodLabel, mood === option.emoji && { color: colors.text }]}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TextInput
          style={styles.contentInput}
          placeholder="记录你的思绪..."
          placeholderTextColor={colors.placeholder}
          value={content}
          onChangeText={setContent}
          editable={!isSaving}
          multiline
          textAlignVertical="top"
          blurOnSubmit={false}
          onFocus={() => {
            setIsEditing(true);
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
          }}
          onBlur={() => setIsEditing(false)}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        />

        {/* Image grid */}
        {imageUris.length > 0 && (
          <View style={styles.imageGrid}>
            {imageUris.map((uri, index) => (
              <View key={`${uri}-${index}`} style={styles.imageThumb}>
                <Image source={{ uri }} style={styles.imageThumbImg} />
                <TouchableOpacity
                  style={styles.imageRemoveBtn}
                  onPress={() => handleRemoveImage(index)}
                >
                  <MaterialIcons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        {imageUris.length < 9 && (
          <TouchableOpacity style={[styles.addImageButton, { borderColor: colors.border }]} onPress={handleAddImage}>
            <MaterialIcons name="camera-alt" size={22} color={colors.textSecondary} />
            <Text style={[styles.addImageText, { color: colors.textSecondary }]}>添加图片 ({imageUris.length}/9)</Text>
          </TouchableOpacity>
        )}
        {!isEditing && (
          <Text style={styles.updatedAtLabel}>
            -- {format(new Date(loadedUpdatedAt || new Date()), 'MM/dd HH:mm')}
          </Text>
        )}
        <TextInput
          style={styles.tagsInput}
          placeholder="标签（如：#生活#日常#感悟）"
          placeholderTextColor={colors.placeholder}
          value={tagsText}
          onChangeText={setTagsText}
          editable={!isSaving}
          blurOnSubmit={false}
          onFocus={() => {
            setIsEditing(true);
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
          }}
          onBlur={() => setIsEditing(false)}
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
              <MaterialIcons name="web" size={28} color={colors.primary} />
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

export default DiaryDetailScreen;

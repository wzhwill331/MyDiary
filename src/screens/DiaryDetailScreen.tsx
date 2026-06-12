import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Alert, Image, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { MaterialIcons } from '@expo/vector-icons';
import { v4 as uuidv4 } from 'uuid';
import { RootStackParamList } from '../../App';
import { useDatabase } from '../services/database';
import { useSettings } from '../services/settings';
import { useThemeColors, getFontFamily, ThemeColors } from '../services/theme';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { DiaryEntry, DiaryFolder, MOOD_OPTIONS, DIARY_BACKGROUNDS, getDiaryBackground } from '../types/diary';
import { ALL_TEMPLATES, DiaryTemplate, TEMPLATE_CATEGORIES } from '../types/template';
import { exportSingleEntryToHtml, shareDiaryAsImage, saveDiaryImageToAlbum } from '../utils/export';
import DiaryCard from '../components/DiaryCard';
import UnlockModal from '../components/UnlockModal';
import { getLockedFolderIds, hasPassword } from '../services/password';
import { StarryBackground } from '../components/StarryBackground';

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
  editorBody: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    margin: 0,
    borderRadius: 0,
    backgroundColor: colors.card,
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  dateMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateMetaText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.brandSecondary,
    letterSpacing: 0.2,
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
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 13,
    marginBottom: 14,
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
    borderRadius: 14,
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
    fontSize: Math.min(settings.fontSize + 7, 27),
    fontWeight: '700',
    marginBottom: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
    color: colors.text,
    fontFamily: getFontFamily(settings.fontFamily),
  },
  contentInput: {
    fontSize: Math.min(settings.fontSize, 18),
    lineHeight: Math.min(settings.fontSize + 9, 27),
    minHeight: 360,
    marginBottom: 16,
    color: colors.textSecondary,
    fontFamily: getFontFamily(settings.fontFamily),
    paddingVertical: 8,
  },
  moodSelector: {
    marginHorizontal: -20,
    marginBottom: 12,
  },
  moodSelectorContent: {
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 20,
    paddingRight: 32,
  },
  moodButton: {
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    minWidth: 52,
  },
  moodEmoji: {
    fontSize: 22,
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
    borderRadius: 14,
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
    borderRadius: 14,
    marginBottom: 12,
    gap: 8,
  },
  addImageText: {
    fontSize: 14,
    fontFamily: getFontFamily(settings.fontFamily),
  },
  tagsInput: {
    fontSize: Math.min(settings.fontSize - 2, 16),
    paddingVertical: 10,
    paddingHorizontal: 0,
    minHeight: 44,
    borderTopWidth: 0,
    borderBottomWidth: 0,
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
  countBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.tabBarBorder,
    backgroundColor: colors.tabBar,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  countText: {
    flex: 1,
    fontSize: 12,
    color: colors.textTertiary,
  },
  editorTool: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorSave: {
    minWidth: 78,
    height: 42,
    marginLeft: 6,
    paddingHorizontal: 20,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorSaveText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  templateCategoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 14,
  },
  templateCategory: {
    minWidth: 88,
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 11,
    backgroundColor: colors.surfaceMuted,
  },
  templateCategoryActive: {
    backgroundColor: colors.primary,
  },
  templateCategoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  templateCategoryTextActive: {
    color: colors.onPrimary,
  },
  templateCard: {
    padding: 14,
    marginBottom: 10,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
  },
  templateCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  templateIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateCardCopy: {
    flex: 1,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  templateDescription: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textTertiary,
  },
  templateMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 12,
  },
  templateMetaText: {
    fontSize: 11,
    color: colors.placeholder,
  },
  templateTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.card,
    fontSize: 11,
    color: colors.textSecondary,
  },
  tagSuggestions: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    marginHorizontal: 0,
    marginBottom: 4,
    maxHeight: 200,
    overflow: 'hidden',
  },
  tagSuggestionItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  tagSuggestionText: {
    fontSize: 14,
    color: colors.textSecondary,
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
    borderRadius: 22,
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
    paddingVertical: 12,
    borderRadius: 12,
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
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.input,
    alignItems: 'center',
  },
  modalBtnCancelText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  modalBtnConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  modalBtnConfirmText: {
    fontSize: 16,
    color: colors.onPrimary,
    fontWeight: '600',
  },
});

const DiaryDetailScreen = ({ route, navigation }: DiaryDetailScreenProps) => {
  const entryId = route.params?.entryId;
  const presetFolderId = route.params?.folderId;
  const templateId = route.params?.templateId;
  const database = useDatabase();
  const { settings } = useSettings();
  const colors = useThemeColors();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [folderId, setFolderId] = useState<string | null>(presetFolderId ?? null);
  const [folders, setFolders] = useState<DiaryFolder[]>([]);
  const [originalSnapshot, setOriginalSnapshot] = useState({ title: '', content: '', tagsText: '', folderId: null as string | null, mood: null as string | null, imageUris: [] as string[], background: null as string | null });
  const [loadedUpdatedAt, setLoadedUpdatedAt] = useState<string | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(!entryId);
  const [templateCategoryId, setTemplateCategoryId] = useState(TEMPLATE_CATEGORIES[0].id);
  const [isEditing, setIsEditing] = useState(false);
  const [mood, setMood] = useState<string | null>(null);
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [background, setBackground] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  const [pendingEntry, setPendingEntry] = useState<DiaryEntry | null>(null);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [contentSelection, setContentSelection] = useState<{ start: number; end: number } | undefined>(undefined);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [menuPos, setMenuPos] = useState({ y: 0 });
  const menuBtnRef = useRef<View>(null);
  const cardRef = useRef<View>(null) as React.MutableRefObject<View>;
  const formRef = useRef({ title: '', content: '', tagsText: '', folderId: null as string | null, mood: null as string | null, imageUris: [] as string[], background: null as string | null });
  const scrollRef = useRef<any>(null);
  const contentInputRef = useRef<TextInput>(null);
  const tagsInputRef = useRef<TextInput>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const cursorOffsetRef = useRef(0);
  const keyboardVisibleRef = useRef(false);
  const prevContentLenRef = useRef(0);
  const prevContentHeightRef = useRef(0);
  const scrollYRef = useRef(0);
  const lineHeight = 24;

  // Scroll so that the given line index is visible above the keyboard
  const scrollToLine = useCallback((lineIndex: number) => {
    if (!scrollRef.current) return;
    const scrollTo = Math.max(0, lineIndex * lineHeight - 150);
    scrollRef.current.scrollTo({ y: scrollTo, animated: true });
  }, []);

  // Scroll to the current cursor position
  const scrollToCursor = useCallback(() => {
    // Skip if cursor position not yet known (ref is 0 at initial focus)
    if (cursorOffsetRef.current === 0 && formRef.current.content.length > 0) return;
    const currentText = formRef.current.content;
    const textBeforeCursor = currentText.substring(0, cursorOffsetRef.current);
    const currentLine = textBeforeCursor.split('\n').length - 1;
    scrollToLine(currentLine);
  }, [scrollToLine]);

  // Track input layout for keyboard avoidance
  const handleInputLayout = useCallback((_e: any) => {
    // Input layout changed — no-op, but needed for onLayout prop
  }, []);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      keyboardVisibleRef.current = true;
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      keyboardVisibleRef.current = false;
      setKeyboardHeight(0);
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);


  formRef.current = { title, content, tagsText, folderId, mood, imageUris, background };

  const applyLoadedEntry = useCallback((entry: DiaryEntry) => {
    const nextSnapshot = {
      title: entry.title,
      content: entry.content,
      tagsText: entry.tags.join(', '),
      folderId: entry.folderId,
      mood: entry.mood ?? null,
      imageUris: entry.imageUris ?? [],
      background: entry.background ?? null,
    };
    setTitle(nextSnapshot.title);
    setContent(nextSnapshot.content);
    prevContentLenRef.current = nextSnapshot.content.length;
    setTagsText(nextSnapshot.tagsText);
    setFolderId(nextSnapshot.folderId);
    setMood(nextSnapshot.mood);
    setImageUris(nextSnapshot.imageUris);
    setBackground(nextSnapshot.background);
    setOriginalSnapshot(nextSnapshot);
    setLoadedUpdatedAt(entry.updatedAt);
    setIsPinned(entry.isPinned ?? false);
    setIsLocked(entry.locked ?? false);
    navigation.setOptions({ title: '编辑日记' });
  }, [navigation]);



  const styles = useStyles(colors, settings);

  const hasUnsavedChanges =
    title !== originalSnapshot.title ||
    content !== originalSnapshot.content ||
    tagsText !== originalSnapshot.tagsText ||
    folderId !== originalSnapshot.folderId ||
    mood !== originalSnapshot.mood ||
    JSON.stringify(imageUris) !== JSON.stringify(originalSnapshot.imageUris) ||
    background !== originalSnapshot.background;

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      // Load folders and tags
      try {
        const [folderList, tags] = await Promise.all([database.listFolders(), database.getAllTags()]);
        if (mounted) {
          setFolders(folderList);
          setAllTags(tags);
        }
      } catch (error) {
        console.error('Failed to load folders', error);
      }

      // Load entry if editing
      if (!entryId) {
        navigation.setOptions({ title: '新建日记' });
        setLoadedUpdatedAt(new Date().toISOString());
        if (templateId) {
          const template = ALL_TEMPLATES.find((t) => t.id === templateId);
          if (template) {
            setTitle(template.title);
            setContent(template.content);
            prevContentLenRef.current = template.content.length;
            setTagsText(template.tags?.map((tag) => `#${tag}`).join(' ') ?? '');
            setMood(template.mood ?? null);
            setShowTemplateModal(false);
          }
        }
        return;
      }

      try {
        const entry = await database.getEntryById(entryId);
        if (!mounted || !entry) return;

        const lockedFolders = await getLockedFolderIds();
        const protectedEntry = !!entry.locked || (!!entry.folderId && lockedFolders.includes(entry.folderId));
        if (protectedEntry) {
          if (!(await hasPassword())) {
            Alert.alert('无法解锁', '请先在“我的”页面设置应用密码。', [
              { text: '返回', onPress: () => navigation.goBack() },
            ]);
            return;
          }
          setPendingEntry(entry);
          setShowUnlockModal(true);
          navigation.setOptions({ title: '已锁定日记' });
          return;
        }

        applyLoadedEntry(entry);
      } catch (error) {
        console.error('Failed to load diary entry', error);
        Alert.alert('错误', '加载日记失败。');
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [applyLoadedEntry, database, entryId, navigation, templateId]);

  const pendingActionRef = useRef<any>(null);
  const allowExitRef = useRef(false);
  const handleSaveAndExitRef = useRef<(() => Promise<void>) | null>(null);

  const handleBack = useCallback(() => {
    if (!hasUnsavedChanges) {
      navigation.goBack();
      return;
    }

    Alert.alert('未保存的修改', '当前日记还没有保存。', [
      { text: '继续编辑', style: 'cancel' },
      {
        text: '不保存',
        style: 'destructive',
        onPress: () => {
          allowExitRef.current = true;
          navigation.goBack();
        },
      },
      { text: '保存', onPress: () => void handleSaveAndExitRef.current?.() },
    ]);
  }, [hasUnsavedChanges, navigation]);

  // 拦截全面屏手势返回和物理返回键

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!hasUnsavedChanges || allowExitRef.current) {
        allowExitRef.current = false;
        return;
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
          if (action) {
            allowExitRef.current = true;
            navigation.dispatch(action);
          }
        }},
        { text: '保存', onPress: () => handleSaveAndExit() },
      ]);
    });

    return unsubscribe;
  }, [hasUnsavedChanges, navigation]);

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
        background: form.background,
      };

      if (entryId) {
        await database.updateEntry(entryId, input);
      } else {
        await database.createEntry(uuidv4(), input);
      }

      const action = pendingActionRef.current;
      pendingActionRef.current = null;
      allowExitRef.current = true;
      setIsSaving(false);
      if (action) {
        navigation.dispatch(action);
      } else {
        navigation.goBack();
      }
    } catch (error) {
      console.error('Failed to save diary entry', error);
      Alert.alert('错误', '保存日记失败。');
      pendingActionRef.current = null;
      setIsSaving(false);
    }
  }, [database, entryId, navigation]);
  handleSaveAndExitRef.current = handleSaveAndExit;

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
        background: form.background,
      };

      if (entryId) {
        await database.updateEntry(entryId, input);
      } else {
        const newEntry = await database.createEntry(uuidv4(), input);
        navigation.setParams({ entryId: newEntry.id } as any);
      }

      setOriginalSnapshot({ title: trimmedTitle, content: trimmedContent, tagsText: form.tagsText, folderId: form.folderId, mood: form.mood, imageUris: form.imageUris, background: form.background });
      Alert.alert('已保存', '日记保存成功。');
    } catch (error) {
      console.error('Failed to save diary entry', error);
      Alert.alert('错误', '保存日记失败。');
    } finally {
      setIsSaving(false);
    }
  }, [database, entryId, navigation]);
  const handleSelectTemplate = (template: DiaryTemplate) => {
    const apply = () => {
      setTitle(template.title);
      setContent(template.content);
      prevContentLenRef.current = template.content.length;
      setTagsText(template.tags?.map((tag) => `#${tag}`).join(' ') ?? '');
      setMood(template.mood ?? null);
      setShowTemplateModal(false);
    };
    if (title.trim() || content.trim() || tagsText.trim()) {
      Alert.alert('应用模板', '当前标题、正文和标签会被模板替换，确定吗？', [
        { text: '取消', style: 'cancel' },
        { text: '确定', onPress: apply },
      ]);
    } else {
      apply();
    }
  };

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
      try {
        const imageDir = `${FileSystem.documentDirectory}diary-images/`;
        await FileSystem.makeDirectoryAsync(imageDir, { intermediates: true });
        const persisted: string[] = [];
        for (const asset of result.assets) {
          const extension = asset.fileName?.split('.').pop() || asset.uri.split('.').pop()?.split('?')[0] || 'jpg';
          const destination = `${imageDir}${uuidv4()}.${extension}`;
          await FileSystem.copyAsync({ from: asset.uri, to: destination });
          persisted.push(destination);
        }
        setImageUris((prev) => [...prev, ...persisted].slice(0, 9));
      } catch (error) {
        console.error('Failed to persist diary images', error);
        Alert.alert('图片保存失败', '无法将所选图片复制到应用目录。');
      }
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

  const handleToggleLock = useCallback(async () => {
    if (!entryId) return;
    try {
      if (!isLocked && !(await hasPassword())) {
        Alert.alert('请先设置密码', '锁定日记前，请先在“我的”页面设置应用密码。');
        return;
      }
      await database.toggleEntryLock(entryId);
      setIsLocked(!isLocked);
    } catch (error) {
      console.error('Failed to toggle lock', error);
    }
  }, [entryId, database, isLocked]);

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
          <TouchableOpacity onPress={handleSave} style={styles.headerButton} disabled={isSaving} accessibilityLabel="保存日记">
            <MaterialIcons name="save" size={24} color={isSaving ? colors.placeholder : colors.primary} />
          </TouchableOpacity>
          <View ref={menuBtnRef} style={styles.headerButton} onLayout={() => {
            menuBtnRef.current?.measureInWindow((x, y, w, h) => {
              setMenuPos({ y });
            });
          }}>
            <TouchableOpacity onPress={() => setShowMenu(!showMenu)} accessibilityLabel="更多">
              <MaterialIcons name="more-vert" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      ),
    });
  }, [handleBack, handleSave, isSaving, navigation, showMenu]);

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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <StarryBackground />
      {/* Hidden DiaryCard for image capture */}
      <View style={styles.hiddenCard} pointerEvents="none">
        <DiaryCard ref={cardRef} entry={currentEntry} avatarUri={settings.avatarUri} nickname={settings.nickname} />
      </View>

      <KeyboardAvoidingView style={styles.editorBody} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView ref={scrollRef} contentContainerStyle={[styles.scrollContent, { paddingBottom: keyboardHeight + 80, backgroundColor: getDiaryBackground(background).id !== 'default' ? getDiaryBackground(background).background : undefined }]} keyboardShouldPersistTaps="handled" nestedScrollEnabled onScroll={(e) => { scrollYRef.current = e.nativeEvent.contentOffset.y; }} scrollEventThrottle={16}>
        <View style={styles.dateMeta}>
          <Text style={styles.dateMetaText}>
            {format(loadedUpdatedAt ? new Date(loadedUpdatedAt) : new Date(), 'yyyy年M月d日 EEEE')}
          </Text>
          {isSaving && <Text style={[styles.dateMetaText, { color: colors.placeholder }]}>正在保存...</Text>}
        </View>
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
          style={[styles.titleInput, background && background !== 'default' ? { color: getDiaryBackground(background).textColor, borderBottomColor: getDiaryBackground(background).textColor + '30' } : undefined]}
          placeholder="标题（可选）"
          placeholderTextColor={background && background !== 'default' ? getDiaryBackground(background).placeholderColor : colors.placeholder}
          value={title}
          maxFontSizeMultiplier={1.1}
          onChangeText={setTitle}
          editable={!isSaving}
          blurOnSubmit={false}
          onFocus={() => { setIsEditing(true);  }}
          onBlur={() => { setIsEditing(false);  }}
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
              <Text maxFontSizeMultiplier={1.1} style={[styles.moodLabel, mood === option.emoji && { color: colors.text }]}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Tags input with suggestions */}
        <TextInput
          ref={tagsInputRef}
          style={[styles.tagsInput, { color: colors.text, backgroundColor: colors.surfaceMuted, borderRadius: 14, paddingHorizontal: 14, marginVertical: 10 }]}
          placeholder="标签（如：#生活#日常#感悟）"
          placeholderTextColor={colors.placeholder}
          value={tagsText}
          maxFontSizeMultiplier={1.1}
          onChangeText={(text) => {
            setTagsText(text);
            // Show tag suggestions when typing after #
            const lastHash = text.lastIndexOf('#');
            if (lastHash >= 0) {
              const partial = text.slice(lastHash + 1).trim();
              const existingTags = parseTags(text);
              const filtered = allTags.filter((t) =>
                t.includes(partial) && !existingTags.includes(t)
              );
              setTagSuggestions(filtered.slice(0, 8));
              setShowTagSuggestions(filtered.length > 0);
            } else {
              setShowTagSuggestions(false);
            }
          }}
          onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
          editable={!isSaving}
          blurOnSubmit={false}
        />
        {showTagSuggestions && tagSuggestions.length > 0 && (
          <View style={styles.tagSuggestions}>
            {tagSuggestions.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={styles.tagSuggestionItem}
                onPress={() => {
                  const lastHash = tagsText.lastIndexOf('#');
                  const before = tagsText.slice(0, lastHash);
                  setTagsText(before + '#' + tag + (before ? ' ' : ''));
                  setShowTagSuggestions(false);
                }}
              >
                <Text style={styles.tagSuggestionText}>#{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TextInput
          ref={contentInputRef}
          testID="diary-content-input"
          style={[styles.contentInput, background && background !== 'default' ? { color: getDiaryBackground(background).textColor } : undefined]}
          placeholder="记录你的思绪..."
          placeholderTextColor={background && background !== 'default' ? getDiaryBackground(background).placeholderColor : colors.placeholder}
          value={content}
          maxFontSizeMultiplier={1.15}
          onChangeText={(text) => {
            const prevLen = prevContentLenRef.current;
            setContent(text);
            prevContentLenRef.current = text.length;
            // When Enter is pressed (text grew), move cursor after the newline
            if (text.length > prevLen) {
              const addedLen = text.length - prevLen;
              const newPos = cursorOffsetRef.current + addedLen;
              cursorOffsetRef.current = newPos;
              setContentSelection({ start: newPos, end: newPos });
            }
          }}
          editable={!isSaving}
          multiline
          textAlignVertical="top"
          blurOnSubmit={false}
          keyboardType="default"
          autoCorrect={false}
          selection={contentSelection}
          onLayout={handleInputLayout}
          onFocus={() => { setIsEditing(true); }}
          onBlur={() => { setIsEditing(false); }}
          onSelectionChange={(e) => {
            cursorOffsetRef.current = e.nativeEvent.selection.start;
            setContentSelection(e.nativeEvent.selection);
          }}
          onContentSizeChange={(e) => {
            // When content grows (Enter pressed), scroll down by the height increase
            if (keyboardVisibleRef.current && scrollRef.current) {
              const newHeight = e.nativeEvent.contentSize.height;
              const delta = newHeight - prevContentHeightRef.current;
              // Only scroll on small increments (newlines), skip initial load
              if (delta > 0 && delta < 200 && prevContentHeightRef.current > 0) {
                setTimeout(() => {
                  try { scrollRef.current.scrollTo({ y: scrollYRef.current + delta, animated: false }); } catch {}
                }, 50);
              }
              prevContentHeightRef.current = newHeight;
            }
          }}
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
        {imageUris.length > 0 && imageUris.length < 9 && (
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

      </ScrollView>
      </KeyboardAvoidingView>

      {/* Editor toolbar */}
      <View style={styles.countBar}>
        <Text style={styles.countText}>{content.length} 字 · {content.split('\n').length} 行</Text>
        <TouchableOpacity style={styles.editorTool} onPress={handleAddImage} accessibilityLabel="添加图片">
          <MaterialIcons name="image" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.editorTool} onPress={() => tagsInputRef.current?.focus()} accessibilityLabel="编辑标签">
          <MaterialIcons name="sell" size={21} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.editorTool} onPress={() => setShowMenu(true)} accessibilityLabel="更多工具">
          <MaterialIcons name="more-horiz" size={23} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.editorSave} onPress={handleSave} disabled={isSaving} accessibilityLabel="保存">
          <Text style={styles.editorSaveText}>{isSaving ? '保存中' : '保存'}</Text>
        </TouchableOpacity>
      </View>

      {/* Template Selection Modal */}
      <Modal visible={showTemplateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowTemplateModal(false)} />
          <View style={[styles.modalContent, { maxHeight: '82%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={[styles.modalTitle, { marginBottom: 0, textAlign: 'left' }]}>选择模板</Text>
              <TouchableOpacity onPress={() => setShowTemplateModal(false)} style={{ padding: 4 }}>
                <MaterialIcons name="close" size={22} color={colors.placeholder} />
              </TouchableOpacity>
            </View>
            <View style={styles.templateCategoryRow}>
              {TEMPLATE_CATEGORIES.map((category) => {
                const active = category.id === templateCategoryId;
                return (
                  <TouchableOpacity
                    key={category.id}
                    style={[styles.templateCategory, active && styles.templateCategoryActive]}
                    onPress={() => setTemplateCategoryId(category.id)}
                  >
                    <Text style={[styles.templateCategoryText, active && styles.templateCategoryTextActive]}>{category.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <ScrollView style={{ maxHeight: 470 }} showsVerticalScrollIndicator={false}>
              {TEMPLATE_CATEGORIES.find((category) => category.id === templateCategoryId)?.templates.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={styles.templateCard}
                  onPress={() => handleSelectTemplate(t)}
                >
                  <View style={styles.templateCardHeader}>
                    <View style={[styles.templateIcon, { backgroundColor: t.color + '20' }]}>
                      <MaterialIcons name={t.icon as any} size={22} color={t.color} />
                    </View>
                    <View style={styles.templateCardCopy}>
                      <Text style={styles.templateName}>{t.name}</Text>
                      <Text style={styles.templateDescription}>{t.description}</Text>
                    </View>
                    <MaterialIcons name="arrow-forward" size={19} color={colors.placeholder} />
                  </View>
                  <View style={styles.templateMeta}>
                    <MaterialIcons name="schedule" size={14} color={colors.placeholder} />
                    <Text style={styles.templateMetaText}>{t.estimatedMinutes || 5} 分钟</Text>
                    {t.tags?.slice(0, 2).map((tag) => (
                      <Text key={tag} style={styles.templateTag}>#{tag}</Text>
                    ))}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={[styles.modalBtnCancel, { marginTop: 12 }]} onPress={() => setShowTemplateModal(false)}>
              <Text style={styles.modalBtnCancelText}>跳过</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Export Modal */}
      <Modal visible={showExportModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowExportModal(false)} />
          <View style={styles.modalContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={[styles.modalTitle, { marginBottom: 0, textAlign: 'left' }]}>导出日记</Text>
              <TouchableOpacity onPress={() => setShowExportModal(false)} style={{ padding: 4 }}>
                <MaterialIcons name="close" size={22} color={colors.placeholder} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.exportOption} onPress={handleExportImage}>
              <MaterialIcons name="image" size={28} color="#FF9500" />
              <View style={styles.exportOptionText}>
                <Text style={styles.exportOptionTitle}>分享。图片</Text>
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
      {/* Floating Menu */}
      {showMenu && (
        <>
          <TouchableOpacity
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }}
            activeOpacity={1}
            onPress={() => setShowMenu(false)}
          />
          <View style={{
            position: 'absolute',
            top: menuPos.y + 44,
            right: 8,
            backgroundColor: colors.card,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8,
            zIndex: 100,
            minWidth: 180,
            overflow: 'hidden',
          }}>
            {entryId && (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16, gap: 12 }}
                onPress={() => { setShowMenu(false); setShowTemplateModal(true); }}
              >
                <MaterialIcons name="description" size={20} color={colors.primary} />
                <Text style={{ fontSize: 15, color: colors.text, flex: 1 }}>模板</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16, gap: 12 }}
              onPress={() => { setShowMenu(false); handleShare(); }}
            >
              <MaterialIcons name="share" size={20} color={colors.primary} />
              <Text style={{ fontSize: 15, color: colors.text, flex: 1 }}>分享</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16, gap: 12 }}
              onPress={() => { setShowMenu(false); setShowBackgroundPicker(true); }}
            >
              <MaterialIcons name="palette" size={20} color={colors.primary} />
              <Text style={{ fontSize: 15, color: colors.text, flex: 1 }}>更换信纸</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16, gap: 12 }}
              onPress={() => { setShowMenu(false); handleTogglePin(); }}
            >
              <MaterialIcons name="push-pin" size={20} color={isPinned ? colors.primary : colors.textSecondary} />
              <Text style={{ fontSize: 15, color: colors.text, flex: 1 }}>{isPinned ? '取消置顶' : '置顶'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16, gap: 12 }}
              onPress={() => { setShowMenu(false); handleToggleLock(); }}
            >
              <MaterialIcons name={isLocked ? 'lock' : 'lock-open'} size={20} color={isLocked ? colors.danger : colors.textSecondary} />
              <Text style={{ fontSize: 15, color: colors.text, flex: 1 }}>{isLocked ? '取消锁定' : '锁定日记'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16, gap: 12 }}
              onPress={() => { setShowMenu(false); handleSaveToAlbum(); }}
            >
              <MaterialIcons name="save-alt" size={20} color={colors.primary} />
              <Text style={{ fontSize: 15, color: colors.text, flex: 1 }}>保存到相册</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16, gap: 12 }}
              onPress={() => { setShowMenu(false); handleExportHtml(); }}
            >
              <MaterialIcons name="web" size={20} color={colors.primary} />
              <Text style={{ fontSize: 15, color: colors.text, flex: 1 }}>导出网页</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Background Picker Modal */}
      <Modal visible={showBackgroundPicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowBackgroundPicker(false)} />
          <View style={[styles.modalContent, { maxWidth: 360, alignSelf: 'center' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={[styles.modalTitle, { marginBottom: 0, textAlign: 'left' }]}>选择信纸</Text>
              <TouchableOpacity onPress={() => setShowBackgroundPicker(false)} style={{ padding: 4 }}>
                <MaterialIcons name="close" size={22} color={colors.placeholder} />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center' }}>
              {DIARY_BACKGROUNDS.map((bg) => {
                const isActive = background === bg.id || (!background && bg.id === 'default');
                const previewColor = bg.id === 'default' ? colors.card : bg.background;
                return (
                  <TouchableOpacity
                    key={bg.id}
                    onPress={() => { setBackground(bg.id === 'default' ? null : bg.id); setShowBackgroundPicker(false); }}
                    style={{ alignItems: 'center', width: 68, gap: 6 }}
                    activeOpacity={0.7}
                  >
                    <View style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      backgroundColor: previewColor,
                      borderWidth: 2,
                      borderColor: isActive ? colors.primary : colors.border,
                    }} />
                    <Text style={{
                      fontSize: 12,
                      color: isActive ? colors.primary : colors.textSecondary,
                      fontWeight: isActive ? '600' : '400',
                    }}>{bg.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
      <UnlockModal
        visible={showUnlockModal}
        onCancel={() => {
          setShowUnlockModal(false);
          setPendingEntry(null);
          navigation.goBack();
        }}
        onUnlocked={() => {
          if (pendingEntry) applyLoadedEntry(pendingEntry);
          setPendingEntry(null);
          setShowUnlockModal(false);
        }}
      />
    </KeyboardAvoidingView>
  );
};

export default DiaryDetailScreen;

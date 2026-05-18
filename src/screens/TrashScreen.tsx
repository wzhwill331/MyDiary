import React, { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDatabase } from '../services/database';
import { useThemeColors } from '../services/theme';
import { DiaryEntry } from '../types/diary';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

const TrashScreen = ({ navigation }: Props) => {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const database = useDatabase();
  const colors = useThemeColors();

  const loadTrash = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await database.listTrashedEntries();
      setEntries(data);
    } catch (error) {
      console.error('Failed to load trash', error);
    } finally {
      setIsLoading(false);
    }
  }, [database]);

  useFocusEffect(
    useCallback(() => {
      loadTrash();
    }, [loadTrash])
  );

  const handleRestore = (entry: DiaryEntry) => {
    Alert.alert('恢复日记', `确定恢复「${entry.title || '无标题'}」？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '恢复',
        onPress: async () => {
          await database.restoreEntry(entry.id);
          await loadTrash();
        },
      },
    ]);
  };

  const handlePermanentDelete = (entry: DiaryEntry) => {
    Alert.alert('永久删除', `确定永久删除「${entry.title || '无标题'}」？此操作不可恢复。`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await database.permanentDeleteEntry(entry.id);
          await loadTrash();
        },
      },
    ]);
  };

  const handleEmptyTrash = () => {
    if (entries.length === 0) return;
    Alert.alert('清空回收站', `确定永久删除全部 ${entries.length} 篇日记？此操作不可恢复。`, [
      { text: '取消', style: 'cancel' },
      {
        text: '清空',
        style: 'destructive',
        onPress: async () => {
          await database.emptyTrash();
          await loadTrash();
        },
      },
    ]);
  };

  const styles = makeStyles(colors);

  const renderItem = ({ item }: { item: DiaryEntry }) => (
    <View style={styles.entryItem}>
      <View style={styles.entryContent}>
        <Text style={styles.entryTitle} numberOfLines={1}>{item.title || '无标题'}</Text>
        <Text style={styles.entrySnippet} numberOfLines={1}>{item.content || '没有正文'}</Text>
        <Text style={styles.entryDate}>
          删除于 {format(new Date(item.updatedAt), 'MM/dd HH:mm')}
        </Text>
      </View>
      <View style={styles.entryActions}>
        <TouchableOpacity onPress={() => handleRestore(item)} style={styles.actionBtn}>
          <MaterialIcons name="restore" size={22} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handlePermanentDelete(item)} style={styles.actionBtn}>
          <MaterialIcons name="delete-forever" size={22} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {entries.length > 0 && (
        <TouchableOpacity style={styles.emptyTrashBtn} onPress={handleEmptyTrash}>
          <MaterialIcons name="delete-sweep" size={18} color={colors.danger} />
          <Text style={styles.emptyTrashText}>清空回收站</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshing={isLoading}
        onRefresh={loadTrash}
        contentContainerStyle={entries.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyView}>
            <MaterialIcons name="delete-outline" size={64} color={colors.placeholder} />
            <Text style={styles.emptyText}>回收站是空的</Text>
          </View>
        }
      />
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  emptyTrashBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  emptyTrashText: {
    fontSize: 14,
    color: colors.danger,
  },
  listContent: {
    padding: 12,
  },
  entryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 14,
    marginVertical: 5,
    borderRadius: 10,
  },
  entryContent: {
    flex: 1,
    marginRight: 10,
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  entrySnippet: {
    fontSize: 13,
    color: colors.textTertiary,
    marginTop: 4,
  },
  entryDate: {
    fontSize: 11,
    color: colors.placeholder,
    marginTop: 4,
  },
  entryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyView: {
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: colors.placeholder,
  },
});

export default TrashScreen;

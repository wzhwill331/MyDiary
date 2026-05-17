import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { format } from 'date-fns';
import { MaterialIcons } from '@expo/vector-icons';
import { DiaryEntry, DiaryFolder } from '../types/diary';

type DiaryCardProps = {
  entry: DiaryEntry;
  folder?: DiaryFolder | null;
};

const DiaryCard = React.forwardRef<View, DiaryCardProps>(({ entry, folder }, ref) => {
  const date = new Date(entry.createdAt);
  const dateStr = format(date, 'yyyy年MM月dd日 HH:mm');

  return (
    <View ref={ref} style={styles.card} collapsable={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.appName}>📖 MyDiary</Text>
        </View>
        {folder && (
          <View style={[styles.folderBadge, { backgroundColor: folder.color + '20' }]}>
            <MaterialIcons name={folder.icon as any} size={14} color={folder.color} />
            <Text style={[styles.folderName, { color: folder.color }]}>{folder.name}</Text>
          </View>
        )}
      </View>

      {/* Title */}
      <Text style={styles.title}>{entry.title || '无标题'}</Text>

      {/* Date */}
      <View style={styles.dateRow}>
        <MaterialIcons name="access-time" size={14} color="#999" />
        <Text style={styles.date}>{dateStr}</Text>
      </View>

      {/* Content */}
      <Text style={styles.content}>{entry.content || ''}</Text>

      {/* Tags */}
      {entry.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {entry.tags.map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>— 由 MyDiary 导出 —</Text>
      </View>
    </View>
  );
});

DiaryCard.displayName = 'DiaryCard';

const styles = StyleSheet.create({
  card: {
    width: 360,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 28,
    // Shadow for the card itself
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  folderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  folderName: {
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 10,
    lineHeight: 34,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 6,
  },
  date: {
    fontSize: 13,
    color: '#999',
  },
  content: {
    fontSize: 16,
    lineHeight: 28,
    color: '#333',
    marginBottom: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  tag: {
    backgroundColor: '#f0f2f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tagText: {
    fontSize: 13,
    color: '#666',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 14,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#bbb',
  },
});

export default DiaryCard;

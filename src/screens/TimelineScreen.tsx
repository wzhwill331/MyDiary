import React, { useCallback, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { MaterialIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../../App';
import { useDatabase } from '../services/database';
import { useSettings } from '../services/settings';
import { useThemeColors, getFontFamily, ThemeColors } from '../services/theme';
import { DiaryEntry, MOOD_OPTIONS } from '../types/diary';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Timeline'>;

interface TimelineGroup {
  dateStr: string;
  label: string;
  entries: DiaryEntry[];
}

function groupEntriesByDate(entries: DiaryEntry[]): TimelineGroup[] {
  const map = new Map<string, DiaryEntry[]>();
  for (const e of entries) {
    const d = e.createdAt.slice(0, 10);
    if (!map.has(d)) map.set(d, []);
    map.get(d)!.push(e);
  }
  const groups: TimelineGroup[] = [];
  for (const [dateStr, items] of map) {
    const date = parseISO(dateStr);
    let label: string;
    if (isToday(date)) label = '今天';
    else if (isYesterday(date)) label = '昨天';
    else label = format(date, 'MM月dd日 EEEE');
    groups.push({ dateStr, label, entries: items });
  }
  groups.sort((a, b) => b.dateStr.localeCompare(a.dateStr));
  return groups;
}

const useStyles = (colors: ThemeColors, fontSize: number, fontFamily: string) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    listContent: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 120 },
    emptyText: { fontSize: 16, color: colors.textSecondary, marginTop: 12 },

    /* Date header */
    dateHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 20,
      marginBottom: 10,
      marginLeft: 18,
    },
    dateHeaderText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSecondary,
      fontFamily,
    },

    /* Timeline row */
    timelineRow: {
      flexDirection: 'row',
      marginBottom: 0,
    },
    timelineLeft: {
      width: 36,
      alignItems: 'center',
    },
    timelineDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.primary,
      marginTop: 18,
    },
    timelineLine: {
      width: 2,
      flex: 1,
      backgroundColor: colors.border,
      minHeight: 8,
    },
    timelineRight: {
      flex: 1,
      paddingLeft: 8,
      paddingBottom: 10,
    },

    /* Entry card */
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
      fontFamily,
    },
    cardContent: {
      fontSize: fontSize - 1,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: 8,
      fontFamily,
    },
    cardMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
    },
    cardMood: {
      fontSize: 16,
    },
    cardTag: {
      fontSize: 12,
      color: colors.primary,
      backgroundColor: colors.primary + '20',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      overflow: 'hidden',
      fontFamily,
    },
    cardTime: {
      fontSize: 12,
      color: colors.placeholder,
      marginLeft: 'auto',
      fontFamily,
    },
  });

const TimelineScreen = () => {
  const navigation = useNavigation<Nav>();
  const database = useDatabase();
  const { settings } = useSettings();
  const colors = useThemeColors();
  const [groups, setGroups] = useState<TimelineGroup[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const entries = await database.listEntries();
        setGroups(groupEntriesByDate(entries));
      })();
    }, [])
  );

  const styles = useStyles(colors, settings.fontSize, getFontFamily(settings.fontFamily ?? 'system') ?? 'System');

  const moodMap = new Map(MOOD_OPTIONS.map((m) => [m.emoji, m]));

  const renderGroup = ({ item }: { item: TimelineGroup }) => (
    <View>
      <View style={styles.dateHeader}>
        <Text style={styles.dateHeaderText}>{item.label}</Text>
      </View>
      {item.entries.map((entry, idx) => {
        const isLast = idx === item.entries.length - 1;
        const moodInfo = entry.mood ? moodMap.get(entry.mood) : null;
        const contentPreview = entry.content.replace(/[#*_~`>\-\[\]()!]/g, '').slice(0, 80);
        return (
          <View key={entry.id} style={styles.timelineRow}>
            <View style={styles.timelineLeft}>
              <View
                style={[
                  styles.timelineDot,
                  { backgroundColor: moodInfo?.color || colors.primary },
                ]}
              />
              {!isLast && <View style={styles.timelineLine} />}
            </View>
            <View style={styles.timelineRight}>
              <TouchableOpacity
                style={[styles.card, { borderLeftColor: moodInfo?.color || colors.primary }]}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('DiaryDetail', { entryId: entry.id })}
              >
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {entry.title || '无标题'}
                </Text>
                {contentPreview ? (
                  <Text style={styles.cardContent} numberOfLines={2}>
                    {contentPreview}
                  </Text>
                ) : null}
                <View style={styles.cardMeta}>
                  {moodInfo && <Text style={styles.cardMood}>{moodInfo.emoji}</Text>}
                  {entry.tags.slice(0, 3).map((tag) => (
                    <Text key={tag} style={styles.cardTag}>
                      #{tag}
                    </Text>
                  ))}
                  <Text style={styles.cardTime}>
                    {format(parseISO(entry.createdAt), 'HH:mm')}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={groups}
        keyExtractor={(g) => g.dateStr}
        renderItem={renderGroup}
        contentContainerStyle={groups.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          <>
            <MaterialIcons name="timeline" size={48} color={colors.placeholder} />
            <Text style={styles.emptyText}>还没有日记，去写一篇吧</Text>
          </>
        }
      />
    </View>
  );
};

export default TimelineScreen;

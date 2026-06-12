import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, isToday } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDatabase } from '../services/database';
import { useThemeColors } from '../services/theme';
import { DiaryEntry, MOOD_OPTIONS } from '../types/diary';
import { getLockedFolderIds } from '../services/password';
import { EmptyState } from '../components/ui';
import { StarryBackground } from '../components/StarryBackground';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

const CalendarScreen = ({ navigation }: Props) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth());
  const yearScrollRef = useRef<ScrollView>(null);
  const monthScrollRef = useRef<ScrollView>(null);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [dateEntryMap, setDateEntryMap] = useState<Record<string, number>>({});
  const [dateMoodMap, setDateMoodMap] = useState<Record<string, string>>({});
  const database = useDatabase();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const loadMonthData = useCallback(async () => {
    try {
      const allEntries = await database.listEntries();
      const lockedFolderIds = await getLockedFolderIds();
      const map: Record<string, number> = {};
      const moodMap: Record<string, string> = {};
      for (const entry of allEntries) {
        if (entry.locked || (entry.folderId && lockedFolderIds.includes(entry.folderId))) continue;
        const dateKey = format(new Date(entry.createdAt), 'yyyy-MM-dd');
        map[dateKey] = (map[dateKey] || 0) + 1;
        if (entry.mood) {
          moodMap[dateKey] = entry.mood;
        }
        // Also count if updatedAt is different day
        const updateKey = format(new Date(entry.updatedAt), 'yyyy-MM-dd');
        if (updateKey !== dateKey) {
          map[updateKey] = (map[updateKey] || 0) + 1;
          if (entry.mood) {
            moodMap[updateKey] = entry.mood;
          }
        }
      }
      setDateEntryMap(map);
      setDateMoodMap(moodMap);
    } catch (error) {
      console.error('Failed to load month data', error);
    }
  }, [database]);

  const loadDayEntries = useCallback(async (date: Date) => {
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const allEntries = await database.listEntries();
      const lockedFolderIds = await getLockedFolderIds();
      const dayEntries = allEntries.filter((e) => {
        if (e.locked || (e.folderId && lockedFolderIds.includes(e.folderId))) return false;
        const created = format(new Date(e.createdAt), 'yyyy-MM-dd');
        const updated = format(new Date(e.updatedAt), 'yyyy-MM-dd');
        return created === dateStr || updated === dateStr;
      });
      setEntries(dayEntries);
    } catch (error) {
      console.error('Failed to load day entries', error);
    }
  }, [database]);

  useFocusEffect(
    useCallback(() => {
      loadMonthData();
      loadDayEntries(selectedDate);
    }, [loadMonthData, loadDayEntries, selectedDate])
  );

  useEffect(() => {
    loadDayEntries(selectedDate);
  }, [selectedDate, loadDayEntries]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = getDay(monthStart);
  const recordedDays = days.filter((day) => (dateEntryMap[format(day, 'yyyy-MM-dd')] || 0) > 0);
  const monthEntryCount = days.reduce((total, day) => total + (dateEntryMap[format(day, 'yyyy-MM-dd')] || 0), 0);
  const moodCounts = days.reduce<Record<string, number>>((counts, day) => {
    const mood = dateMoodMap[format(day, 'yyyy-MM-dd')];
    if (mood) counts[mood] = (counts[mood] || 0) + 1;
    return counts;
  }, {});
  const leadingMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];
  const streak = (() => {
    let count = 0;
    const cursor = new Date();
    while ((dateEntryMap[format(cursor, 'yyyy-MM-dd')] || 0) > 0) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  })();

  useEffect(() => {
    if (showPicker) {
      setTimeout(() => {
        yearScrollRef.current?.scrollTo({ y: (pickerYear - 2020) * 44, animated: false });
        monthScrollRef.current?.scrollTo({ y: pickerMonth * 44, animated: false });
      }, 100);
    }
  }, [showPicker, pickerYear, pickerMonth]);

  const handlePickerConfirm = () => {
    const newDate = new Date(pickerYear, pickerMonth, 1);
    setCurrentMonth(newDate);
    setSelectedDate(newDate);
    setShowPicker(false);
  };

  const styles = makeStyles(colors, insets.top);

  const renderCalendar = () => (
    <View style={styles.calendar}>
      {/* Month navigation */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <MaterialIcons name="chevron-left" size={28} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {
          setPickerYear(currentMonth.getFullYear());
          setPickerMonth(currentMonth.getMonth());
          setShowPicker(true);
        }}>
          <Text style={styles.monthTitle}>{format(currentMonth, 'yyyy年 M月')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <MaterialIcons name="chevron-right" size={28} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Year/Month Picker Modal */}
      <Modal visible={showPicker} transparent animationType="fade">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContent}>
            <Text style={styles.pickerTitle}>选择年月</Text>
            <View style={styles.pickerWheelRow}>
              <View style={styles.pickerWheelCol}>
                <View style={styles.pickerHighlight} />
                <ScrollView ref={yearScrollRef} style={styles.pickerWheel} showsVerticalScrollIndicator={false} snapToInterval={44} decelerationRate="fast"
                  onMomentumScrollEnd={(e) => setPickerYear(2020 + Math.round(e.nativeEvent.contentOffset.y / 44))}
                  onScrollEndDrag={(e) => setPickerYear(2020 + Math.round(e.nativeEvent.contentOffset.y / 44))}>
                  <View style={styles.pickerSpacer} />
                  {Array.from({ length: 21 }, (_, i) => 2020 + i).map((y) => (
                    <View key={y} style={styles.pickerWheelItem}>
                      <Text style={[styles.pickerWheelText, y === pickerYear && styles.pickerWheelTextActive]}>{y} 年</Text>
                    </View>
                  ))}
                  <View style={styles.pickerSpacer} />
                </ScrollView>
              </View>
              <View style={styles.pickerWheelCol}>
                <View style={styles.pickerHighlight} />
                <ScrollView ref={monthScrollRef} style={styles.pickerWheel} showsVerticalScrollIndicator={false} snapToInterval={44} decelerationRate="fast"
                  onMomentumScrollEnd={(e) => setPickerMonth(Math.round(e.nativeEvent.contentOffset.y / 44))}
                  onScrollEndDrag={(e) => setPickerMonth(Math.round(e.nativeEvent.contentOffset.y / 44))}>
                  <View style={styles.pickerSpacer} />
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <View key={m} style={styles.pickerWheelItem}>
                      <Text style={[styles.pickerWheelText, m === pickerMonth + 1 && styles.pickerWheelTextActive]}>{m} 月</Text>
                    </View>
                  ))}
                  <View style={styles.pickerSpacer} />
                </ScrollView>
              </View>
            </View>
            <View style={styles.pickerActions}>
              <TouchableOpacity style={styles.pickerCancelBtn} onPress={() => setShowPicker(false)}>
                <Text style={styles.pickerCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pickerConfirmBtn} onPress={handlePickerConfirm}>
                <Text style={styles.pickerConfirmBtnText}>确定</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Weekday headers */}
      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((day) => (
          <Text key={day} style={styles.weekdayText}>{day}</Text>
        ))}
      </View>

      {/* Days grid */}
      <View style={styles.daysGrid}>
        {/* Empty cells for padding */}
        {Array.from({ length: startPadding }).map((_, i) => (
          <View key={`pad-${i}`} style={styles.dayCell} />
        ))}
        {days.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const count = dateEntryMap[dateKey] || 0;
          const isSelected = isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);

          return (
            <TouchableOpacity
              key={dateKey}
              style={[
                styles.dayCell,
                isSelected && styles.dayCellSelected,
                isTodayDate && !isSelected && styles.dayCellToday,
                !isSelected && dateMoodMap[dateKey] && { backgroundColor: (MOOD_OPTIONS.find((m) => m.emoji === dateMoodMap[dateKey])?.color || colors.primary) + '18' },
              ]}
              onPress={() => setSelectedDate(day)}
            >
              <Text style={[
                styles.dayText,
                isSelected && styles.dayTextSelected,
                isTodayDate && !isSelected && styles.dayTextToday,
              ]}>
                {format(day, 'd')}
              </Text>
              {count > 0 && (
                <View style={[styles.dayDot, isSelected && styles.dayDotSelected, !isSelected && dateMoodMap[dateKey] ? { backgroundColor: MOOD_OPTIONS.find((m) => m.emoji === dateMoodMap[dateKey])?.color + '40' } : {}]}>
                  <Text style={[styles.dayDotText, isSelected && styles.dayDotTextSelected, !isSelected && dateMoodMap[dateKey] ? { color: MOOD_OPTIONS.find((m) => m.emoji === dateMoodMap[dateKey])?.color } : {}]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: DiaryEntry }) => (
    <TouchableOpacity
      style={styles.entryItem}
      onPress={() => navigation.navigate('DiaryTab' as any, { screen: 'DiaryDetail', params: { entryId: item.id } } as any)}
    >
      <View style={styles.entryContent}>
        <Text style={styles.entryTitle} numberOfLines={1}>{item.title || '无标题'}</Text>
        <Text style={styles.entrySnippet} numberOfLines={1}>{item.content || '没有正文'}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={20} color={colors.placeholder} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StarryBackground />
      {renderCalendar()}
      <View style={styles.dayHeader}>
        <Text style={styles.dayTitle}>{format(selectedDate, 'M月d日 EEEE', { locale: zhCN })}</Text>
        <Text style={styles.dayCount}>{entries.length} 篇日记</Text>
      </View>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>本月记录</Text>
          <Text style={styles.summaryValue}>{monthEntryCount}</Text>
          <Text style={styles.summaryHint}>{recordedDays.length} 个有记录的日子</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>连续记录</Text>
          <View style={styles.summaryMoodRow}>
            <Text style={styles.summaryValue}>{streak}</Text>
            <Text style={styles.summaryUnit}>天</Text>
            {leadingMood && <Text style={styles.summaryEmoji}>{leadingMood[0]}</Text>}
          </View>
          <Text style={styles.summaryHint}>
            {leadingMood ? `本月最常见心情 · ${leadingMood[1]} 天` : '从今天写下一笔开始'}
          </Text>
        </View>
      </View>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={entries.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          <EmptyState icon="event-note" title="这天还没有记录" description="选一个有心情标记的日期，或去写下今天" />
        }
      />
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useThemeColors>, topInset: number) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: topInset,
  },
  calendar: {
    backgroundColor: colors.card,
    paddingTop: 10,
    paddingBottom: 6,
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.035,
    shadowRadius: 10,
    elevation: 1,
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: colors.textTertiary,
    paddingVertical: 6,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  dayText: {
    fontSize: 15,
    color: colors.text,
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  dayTextToday: {
    color: colors.primary,
    fontWeight: '600',
  },
  dayDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  dayDotSelected: {
    backgroundColor: '#fff',
  },
  dayDotText: {
    fontSize: 9,
    color: colors.primary,
    fontWeight: '600',
  },
  dayDotTextSelected: {
    color: colors.primary,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  dayCount: {
    fontSize: 13,
    color: colors.textTertiary,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 28,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  summaryCard: {
    flex: 1,
    minHeight: 88,
    padding: 13,
    borderRadius: 15,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  summaryValue: {
    marginTop: 5,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
    color: colors.brandSecondary,
  },
  summaryUnit: {
    marginLeft: 4,
    marginBottom: 4,
    fontSize: 13,
    color: colors.textSecondary,
  },
  summaryMoodRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  summaryEmoji: {
    marginLeft: 'auto',
    marginBottom: 3,
    fontSize: 22,
  },
  summaryHint: {
    marginTop: 3,
    fontSize: 11,
    color: colors.placeholder,
  },
  entryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    marginVertical: 7,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
  },
  entryContent: {
    flex: 1,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  emptyText: {
    fontSize: 15,
    color: colors.placeholder,
  },
  // Picker modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: colors.modalOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pickerContent: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  pickerWheelRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    height: 180,
    marginBottom: 20,
  },
  pickerWheelCol: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
  },
  pickerHighlight: {
    position: 'absolute',
    top: '50%',
    left: 4,
    right: 4,
    height: 44,
    marginTop: -22,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 0,
  },
  pickerWheel: {
    flex: 1,
  },
  pickerSpacer: {
    height: 66,
  },
  pickerWheelItem: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerWheelText: {
    fontSize: 18,
    color: colors.placeholder,
  },
  pickerWheelTextActive: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  pickerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  pickerCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
  },
  pickerCancelText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  pickerConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  pickerConfirmBtnText: {
    fontSize: 16,
    color: colors.onPrimary,
    fontWeight: '600',
  },
});

export default CalendarScreen;

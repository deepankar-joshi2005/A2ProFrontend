import { useState } from 'react';
import { Modal, Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface Props {
  visible: boolean;
  value: Date | null;
  onSelect: (d: Date) => void;
  onClose: () => void;
}

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export default function CalendarPickerModal({ visible, value, onSelect, onClose }: Props) {
  const { palette } = useTheme();
  const [viewDate, setViewDate] = useState(value ?? new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = new Date();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const goToMonth = (offset: number) => {
    setViewDate(new Date(year, month + offset, 1));
  };

  const handleShow = () => {
    setViewDate(value ?? new Date());
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onShow={handleShow}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.card, { backgroundColor: palette.sheetBg, borderColor: palette.surfaceBorder }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Pressable onPress={() => goToMonth(-1)} hitSlop={10} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={20} color={palette.text} />
            </Pressable>
            <Text style={[styles.headerText, { color: palette.text }]}>{MONTHS[month]} {year}</Text>
            <Pressable onPress={() => goToMonth(1)} hitSlop={10} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={20} color={palette.text} />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((w, i) => (
              <View key={i} style={styles.cell}>
                <Text style={[styles.weekdayText, { color: palette.textMuted }]}>{w}</Text>
              </View>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((date, i) => {
              if (!date) return <View key={i} style={styles.cell} />;
              const selected = value ? isSameDay(date, value) : false;
              const isToday = isSameDay(date, today);
              return (
                <View key={i} style={styles.cell}>
                  <Pressable
                    style={[
                      styles.dayBtn,
                      selected && { backgroundColor: palette.accent },
                      !selected && isToday && { borderWidth: 1, borderColor: palette.accent },
                    ]}
                    onPress={() => onSelect(date)}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        { color: selected ? '#FFFFFF' : isToday ? palette.accent : palette.text },
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>

          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
            <Text style={[styles.closeText, { color: palette.textMuted }]}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  navBtn: { padding: 6 },
  headerText: { fontSize: 15, fontWeight: '800' },
  weekRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  weekdayText: { fontSize: 12, fontWeight: '700' },
  dayBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: { fontSize: 14, fontWeight: '600' },
  closeBtn: { alignSelf: 'center', marginTop: 12 },
  closeText: { fontSize: 13, fontWeight: '600' },
});

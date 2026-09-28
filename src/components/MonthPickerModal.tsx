import { useState } from 'react';
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface Props {
  visible: boolean;
  selectedYear: number;
  selectedMonth: number; // 0-indexed (0 = Jan, 11 = Dec)
  onApply: (year: number, month: number) => void;
  onClose: () => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function MonthPickerModal({
  visible,
  selectedYear,
  selectedMonth,
  onApply,
  onClose,
}: Props) {
  const { isDark, palette } = useTheme();
  const [year, setYear] = useState(selectedYear);
  const [month, setMonth] = useState(selectedMonth);

  const handlePrevYear = () => setYear((y) => y - 1);
  const handleNextYear = () => setYear((y) => y + 1);

  const handleApply = () => {
    onApply(year, month);
    onClose();
  };

  const accent = isDark ? palette.accent : '#006666';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            { backgroundColor: isDark ? '#161922' : '#FFFFFF', borderColor: palette.surfaceBorder },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Drag Handle */}
          <View style={[styles.dragHandle, { backgroundColor: isDark ? '#333742' : '#E2E8F0' }]} />

          {/* Title */}
          <Text style={[styles.title, { color: palette.text }]}>Select Month</Text>

          {/* Year Switcher */}
          <View style={styles.yearRow}>
            <Pressable
              style={[styles.yearArrowBtn, { backgroundColor: isDark ? '#222634' : '#F1F5F9' }]}
              onPress={handlePrevYear}
              hitSlop={8}
            >
              <Ionicons name="chevron-back" size={20} color={accent} />
            </Pressable>
            <Text style={[styles.yearText, { color: palette.text }]}>{year}</Text>
            <Pressable
              style={[styles.yearArrowBtn, { backgroundColor: isDark ? '#222634' : '#F1F5F9' }]}
              onPress={handleNextYear}
              hitSlop={8}
            >
              <Ionicons name="chevron-forward" size={20} color={accent} />
            </Pressable>
          </View>

          {/* Month Grid (3 columns x 4 rows) */}
          <View style={styles.grid}>
            {MONTHS.map((mName, idx) => {
              const isSelected = idx === month;
              return (
                <Pressable
                  key={mName}
                  style={[
                    styles.monthBtn,
                    {
                      backgroundColor: isSelected
                        ? accent
                        : isDark
                        ? '#222634'
                        : '#F1F5F9',
                    },
                  ]}
                  onPress={() => setMonth(idx)}
                >
                  <Text
                    style={[
                      styles.monthBtnText,
                      { color: isSelected ? '#FFFFFF' : palette.text },
                    ]}
                  >
                    {mName}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Footer Action Buttons */}
          <View style={styles.actionRow}>
            <Pressable
              style={[styles.cancelBtn, { backgroundColor: isDark ? '#222634' : '#F1F5F9' }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelBtnText, { color: palette.text }]}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.applyBtn, { backgroundColor: accent }]} onPress={handleApply}>
              <Text style={styles.applyBtnText}>Apply</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  dragHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    marginBottom: 20,
  },
  yearArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearText: {
    fontSize: 19,
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  monthBtn: {
    width: '30%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  applyBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});

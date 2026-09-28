import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import OptionSheet, { SheetOption } from './OptionSheet';

interface Props {
  unit: 'months' | 'days';
  value: number;
  onChangeUnit: (unit: 'months' | 'days') => void;
  onChangeValue: (value: number) => void;
}

const MONTH_OPTIONS = [1, 2, 3, 4, 5, 6, 9, 12, 18, 24];
const DAY_OPTIONS = [7, 15, 30, 45, 60, 90, 120, 180, 270, 365];

export default function DurationField({ unit, value, onChangeUnit, onChangeValue }: Props) {
  const { isDark, palette } = useTheme();
  const [sheetVisible, setSheetVisible] = useState(false);
  const accent = isDark ? palette.accent : '#006666';

  const options: SheetOption[] = (unit === 'months' ? MONTH_OPTIONS : DAY_OPTIONS).map((n) => ({
    label: unit === 'months' ? `${n} Month${n > 1 ? 's' : ''}` : `${n} Days`,
    value: String(n),
  }));

  const selectedLabel =
    options.find((o) => Number(o.value) === value)?.label ||
    (unit === 'months' ? `${value} Month${value > 1 ? 's' : ''}` : `${value} Days`);

  return (
    <View>
      <View style={styles.radioRow}>
        <Ionicons name="calendar-outline" size={18} color={palette.textMuted} style={{ marginRight: 8 }} />
        <Pressable style={styles.radioOption} onPress={() => onChangeUnit('months')}>
          <Ionicons
            name={unit === 'months' ? 'radio-button-on' : 'radio-button-off-outline'}
            size={20}
            color={unit === 'months' ? accent : palette.textFaint}
          />
          <Text style={[styles.radioLabel, { color: palette.text }]}>Months</Text>
        </Pressable>
        <Pressable style={styles.radioOption} onPress={() => onChangeUnit('days')}>
          <Ionicons
            name={unit === 'days' ? 'radio-button-on' : 'radio-button-off-outline'}
            size={20}
            color={unit === 'days' ? accent : palette.textFaint}
          />
          <Text style={[styles.radioLabel, { color: palette.text }]}>Days</Text>
        </Pressable>
      </View>

      <Text style={[styles.fieldLabel, { color: palette.textMuted }]}>Select Plan Duration</Text>
      <Pressable
        style={[styles.durationField, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder }]}
        onPress={() => setSheetVisible(true)}
      >
        <Ionicons name="time-outline" size={18} color={palette.textMuted} style={{ marginRight: 10 }} />
        <Text style={[styles.durationText, { color: palette.text }]}>{selectedLabel}</Text>
        <Ionicons name="chevron-down" size={16} color={palette.textMuted} />
      </Pressable>

      <OptionSheet
        visible={sheetVisible}
        title="Select Plan Duration"
        options={options}
        selectedValue={String(value)}
        onSelect={(v) => onChangeValue(Number(v))}
        onClose={() => setSheetVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  radioRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  radioOption: { flexDirection: 'row', alignItems: 'center', marginRight: 22, gap: 6 },
  radioLabel: { fontSize: 14, fontWeight: '600' },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 },
  durationField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 52,
  },
  durationText: { flex: 1, fontSize: 15, fontWeight: '600' },
});

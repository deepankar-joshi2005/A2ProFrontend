import { useState } from 'react';
import { Platform, Pressable, TextInput, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { formatTime12h } from '../utils/date';

const DateTimePicker =
  Platform.OS !== 'web' ? require('@react-native-community/datetimepicker').default : null;

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string | null; // "HH:mm" 24h
  onChange: (hhmm: string) => void;
}

const toDate = (hhmm: string | null): Date => {
  const d = new Date();
  if (hhmm) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
    if (m) {
      d.setHours(Number(m[1]), Number(m[2]), 0, 0);
      return d;
    }
  }
  d.setSeconds(0, 0);
  return d;
};

const toHHMM = (d: Date): string => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export default function TimeInputField({ icon, placeholder, value, onChange }: Props) {
  const { palette } = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const [webText, setWebText] = useState(value || '');

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.wrap, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder }]}>
        <Ionicons name={icon} size={18} color={palette.textMuted} style={styles.icon} />
        <TextInput
          style={[styles.input, { color: palette.text }]}
          placeholder={`${placeholder} (HH:MM)`}
          placeholderTextColor={palette.textFaint}
          value={webText}
          onChangeText={setWebText}
          onBlur={() => {
            if (/^\d{1,2}:\d{2}$/.test(webText.trim())) onChange(webText.trim());
          }}
        />
      </View>
    );
  }

  return (
    <View>
      <Pressable style={[styles.wrap, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder }]} onPress={() => setShowPicker(true)}>
        <Ionicons name={icon} size={18} color={palette.textMuted} style={styles.icon} />
        <Text style={[value ? styles.valueText : styles.placeholderText, { color: value ? palette.text : palette.textFaint }]}>
          {value ? formatTime12h(value) : placeholder}
        </Text>
      </Pressable>
      {showPicker && (
        <DateTimePicker
          value={toDate(value)}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_event: any, selected?: Date) => {
            setShowPicker(false);
            if (selected) onChange(toHHMM(selected));
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 52,
  },
  icon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15 },
  valueText: { flex: 1, fontSize: 15 },
  placeholderText: { flex: 1, fontSize: 15 },
});

import { useState } from 'react';
import { Platform, Pressable, TextInput, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { formatDDMMYYYY, formatDate, parseDDMMYYYY } from '../utils/date';

const DateTimePicker =
  Platform.OS !== 'web' ? require('@react-native-community/datetimepicker').default : null;

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: Date | null;
  onChange: (d: Date) => void;
}

export default function DateInputField({ icon, placeholder, value, onChange }: Props) {
  const { palette } = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const [webText, setWebText] = useState(formatDDMMYYYY(value));

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.wrap, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder }]}>
        <Ionicons name={icon} size={18} color={palette.textMuted} style={styles.icon} />
        <TextInput
          style={[styles.input, { color: palette.text }]}
          placeholder={`${placeholder} (DD/MM/YYYY)`}
          placeholderTextColor={palette.textFaint}
          value={webText}
          onChangeText={setWebText}
          onBlur={() => {
            const parsed = parseDDMMYYYY(webText);
            if (parsed) onChange(parsed);
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
          {value ? formatDate(value) : placeholder}
        </Text>
      </Pressable>
      {showPicker && (
        <DateTimePicker
          value={value ?? new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_event: any, selected?: Date) => {
            setShowPicker(false);
            if (selected) onChange(selected);
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


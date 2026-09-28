import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import DateInputField from '../components/DateInputField';
import { addMeasurement, MeasurementInput } from '../services/measurement.service';

interface Props {
  memberId: string;
  onBack: () => void;
  onSaved: () => void;
}

const FIELDS: { key: keyof MeasurementInput; label: string }[] = [
  { key: 'height', label: 'Height' },
  { key: 'weight', label: 'Weight' },
  { key: 'chest', label: 'Chest' },
  { key: 'waist', label: 'Waist' },
  { key: 'hips', label: 'Hips' },
  { key: 'leftThigh', label: 'Left Thigh' },
  { key: 'rightThigh', label: 'Right Thigh' },
  { key: 'leftArm', label: 'Left Arm' },
  { key: 'rightArm', label: 'Right Arm' },
  { key: 'age', label: 'Age' },
  { key: 'neck', label: 'Neck' },
  { key: 'leftCalf', label: 'Left Calf' },
  { key: 'rightCalf', label: 'Right Calf' },
  { key: 'bodyFatPercent', label: 'Body Fat %' },
];

export default function AddMeasurementScreen({ memberId, onBack, onSaved }: Props) {
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();

  const [date, setDate] = useState<Date>(new Date());
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const setField = (key: string, v: string) => setValues((prev) => ({ ...prev, [key]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const input: MeasurementInput = { date: date.toISOString() };
      for (const f of FIELDS) {
        const raw = values[f.key];
        (input as any)[f.key] = raw !== undefined && raw !== '' ? Number(raw) : null;
      }
      await addMeasurement(memberId, input);
      onSaved();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not save measurement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.root, { backgroundColor: palette.background, paddingTop: insets.top }]}>
        <StatusBar style="light" />

        <View style={[styles.topBar, { backgroundColor: palette.topBarBg }]}>
          <Pressable onPress={onBack} hitSlop={8} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={palette.topBarText} />
          </Pressable>
          <Text style={[styles.topTitle, { color: palette.topBarText }]}>Add Measurement</Text>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 40 }}>
          <DateInputField icon="calendar-outline" placeholder="Measurement Date" value={date} onChange={setDate} />

          {FIELDS.map((f) => (
            <View key={f.key} style={styles.row}>
              <View style={[styles.labelBox, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder }]}>
                <Text style={[styles.labelSmall, { color: palette.textMuted }]}>{f.key === 'age' || f.key === 'bodyFatPercent' ? 'Entry type' : f.label}</Text>
                <Text style={[styles.labelValue, { color: palette.text }]}>{f.label}</Text>
              </View>
              <View style={[styles.valueBox, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder }]}>
                <TextInput
                  style={[styles.input, { color: palette.text }]}
                  placeholder="Value"
                  placeholderTextColor={palette.textFaint}
                  keyboardType="numeric"
                  value={values[f.key] || ''}
                  onChangeText={(v) => setField(f.key, v)}
                />
              </View>
            </View>
          ))}

          <Pressable style={[styles.saveBtn, { backgroundColor: palette.accent }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Save</Text>}
          </Pressable>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  topBar: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 },
  backBtn: { padding: 4 },
  topTitle: { fontSize: 18, fontWeight: '800' },

  row: { flexDirection: 'row', gap: 10, marginTop: 12 },
  labelBox: { flex: 1, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, height: 52, justifyContent: 'center' },
  labelSmall: { fontSize: 10.5, fontWeight: '600' },
  labelValue: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  valueBox: { flex: 1, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, height: 52, justifyContent: 'center' },
  input: { fontSize: 15 },

  saveBtn: { marginTop: 24, paddingVertical: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});

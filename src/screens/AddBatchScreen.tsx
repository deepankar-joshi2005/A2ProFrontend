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
import TimeInputField from '../components/TimeInputField';
import { createBatch, updateBatch, Batch } from '../services/batch.service';

interface Props {
  onBack: () => void;
  onSaved: () => void;
  editingBatch?: Batch | null;
}

export default function AddBatchScreen({ onBack, onSaved, editingBatch }: Props) {
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();

  const [name, setName] = useState(editingBatch?.name || '');
  const [limit, setLimit] = useState(editingBatch ? String(editingBatch.limit) : '');
  const [openTime, setOpenTime] = useState<string | null>(editingBatch?.openTime || null);
  const [closeTime, setCloseTime] = useState<string | null>(editingBatch?.closeTime || null);
  const [saving, setSaving] = useState(false);

  const isEditing = !!editingBatch;

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a batch name.');
      return;
    }
    if (!limit.trim() || Number(limit) <= 0) {
      Alert.alert('Required', 'Please enter a valid batch limit.');
      return;
    }

    setSaving(true);
    try {
      const input = {
        name: name.trim(),
        limit: Number(limit),
        openTime: openTime || '',
        closeTime: closeTime || '',
      };
      if (isEditing && editingBatch) {
        await updateBatch(editingBatch._id, input);
      } else {
        await createBatch(input);
      }
      onSaved();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not save batch');
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
          <Text style={[styles.topTitle, { color: palette.topBarText }]}>{isEditing ? 'Edit Batch' : 'Add Batch'}</Text>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 40 }}>
          <View style={[styles.inputWrap, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder }]}>
            <Ionicons name="people-outline" size={18} color={palette.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: palette.text }]}
              placeholder="Batch Name"
              placeholderTextColor={palette.textFaint}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={[styles.inputWrap, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, marginTop: 14 }]}>
            <Ionicons name="filter-outline" size={18} color={palette.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: palette.text }]}
              placeholder="Batch Limit"
              placeholderTextColor={palette.textFaint}
              keyboardType="numeric"
              value={limit}
              onChangeText={setLimit}
            />
          </View>

          <View style={styles.timeRow}>
            <View style={{ flex: 1 }}>
              <TimeInputField icon="time-outline" placeholder="Open Time" value={openTime} onChange={setOpenTime} />
            </View>
            <View style={{ flex: 1 }}>
              <TimeInputField icon="time-outline" placeholder="Close Time" value={closeTime} onChange={setCloseTime} />
            </View>
          </View>

          <Pressable
            style={[styles.saveBtn, { backgroundColor: palette.accent }]}
            onPress={handleSave}
            disabled={saving}
          >
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

  inputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, height: 52 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15 },
  timeRow: { flexDirection: 'row', gap: 12, marginTop: 14 },

  saveBtn: { marginTop: 24, paddingVertical: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});

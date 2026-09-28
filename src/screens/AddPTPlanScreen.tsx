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
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import DurationField from '../components/DurationField';
import { createPTPlan, updatePTPlan, PTPlan } from '../services/ptPlan.service';

interface Props {
  onBack: () => void;
  onSaved: () => void;
  editingPlan?: PTPlan | null;
}

export default function AddPTPlanScreen({ onBack, onSaved, editingPlan }: Props) {
  const insets = useSafeAreaInsets();
  const { isDark, palette } = useTheme();
  const accent = isDark ? palette.accent : '#006666';

  const [name, setName] = useState(editingPlan?.name || '');
  const [price, setPrice] = useState(editingPlan ? String(editingPlan.amount) : '');
  const [isSessionBased, setIsSessionBased] = useState(editingPlan?.isSessionBased || false);
  const [sessions, setSessions] = useState(editingPlan ? String(editingPlan.sessions || '') : '');
  const [durationUnit, setDurationUnit] = useState<'months' | 'days'>(editingPlan?.durationUnit || 'months');
  const [durationValue, setDurationValue] = useState(editingPlan?.durationValue || 1);
  const [saving, setSaving] = useState(false);

  const isEditing = !!editingPlan;

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a plan name.');
      return;
    }
    if (!price.trim() || Number(price) <= 0) {
      Alert.alert('Required', 'Please enter a valid price.');
      return;
    }
    if (isSessionBased && (!sessions.trim() || Number(sessions) <= 0)) {
      Alert.alert('Required', 'Please enter the number of sessions.');
      return;
    }

    setSaving(true);
    try {
      const input = {
        name: name.trim(),
        amount: Number(price),
        isSessionBased,
        sessions: isSessionBased ? Number(sessions) : 0,
        durationUnit,
        durationValue,
      };
      if (isEditing && editingPlan) {
        await updatePTPlan(editingPlan._id, input);
      } else {
        await createPTPlan(input);
      }
      onSaved();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not save PT plan');
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
          <Text style={[styles.topTitle, { color: palette.topBarText }]}>{isEditing ? 'Edit PT Plan' : 'Add PT Plan'}</Text>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 40 }}>
          <View style={[styles.instructionsCard, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
            <Text style={[styles.instructionsTitle, { color: palette.text }]}>PT Plan Creation Instructions</Text>

            <Text style={[styles.instructionItem, { color: palette.text }]}>1. Set PT plan name and price</Text>
            <Text style={[styles.instructionExample, { color: palette.textMuted }]}>
              Example: "PT - 3 Months" - 15000
            </Text>

            <Text style={[styles.instructionItem, { color: palette.text }]}>2. Choose duration in months or days</Text>
            <Text style={[styles.instructionExample, { color: palette.textMuted }]}>Example: 3 months or 90 days</Text>

            <Text style={[styles.instructionItem, { color: palette.text }]}>3. These PT plans will be assigned to gym members</Text>
            <Text style={[styles.instructionExample, { color: palette.textMuted }]}>
              Example: Assign "PT - 3 Months" to members who need personal training
            </Text>
          </View>

          <View style={[styles.formCard, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
            <View style={[styles.inputWrap, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder }]}>
              <Ionicons name="person-outline" size={18} color={palette.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: palette.text }]}
                placeholder="Plan Name *"
                placeholderTextColor={palette.textFaint}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={[styles.inputWrap, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder }]}>
              <Ionicons name="cash-outline" size={18} color={palette.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: palette.text }]}
                placeholder="Price *"
                placeholderTextColor={palette.textFaint}
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
              />
            </View>

            <View style={styles.switchRow}>
              <Ionicons name="time-outline" size={18} color={palette.textMuted} style={{ marginRight: 8 }} />
              <Text style={[styles.switchLabel, { color: palette.text }]}>Session-based Plan</Text>
              <Switch
                value={isSessionBased}
                onValueChange={setIsSessionBased}
                trackColor={{ false: palette.inputBorder, true: accent }}
                thumbColor="#FFFFFF"
              />
            </View>

            {isSessionBased ? (
              <View style={[styles.inputWrap, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder }]}>
                <Ionicons name="repeat-outline" size={18} color={palette.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: palette.text }]}
                  placeholder="Number of Sessions *"
                  placeholderTextColor={palette.textFaint}
                  keyboardType="numeric"
                  value={sessions}
                  onChangeText={setSessions}
                />
              </View>
            ) : (
              <DurationField
                unit={durationUnit}
                value={durationValue}
                onChangeUnit={setDurationUnit}
                onChangeValue={setDurationValue}
              />
            )}
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

  instructionsCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 18 },
  instructionsTitle: { fontSize: 15, fontWeight: '800', marginBottom: 12 },
  instructionItem: { fontSize: 13.5, fontWeight: '700', marginTop: 8 },
  instructionExample: { fontSize: 12.5, fontWeight: '500', marginTop: 2 },

  formCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 14 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, height: 52 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15 },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
  switchLabel: { flex: 1, fontSize: 14.5, fontWeight: '600' },

  saveBtn: { marginTop: 24, paddingVertical: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});

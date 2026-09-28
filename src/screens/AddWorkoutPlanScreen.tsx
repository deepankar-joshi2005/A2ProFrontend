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
import { createWorkoutPlan, updateWorkoutPlan, WorkoutPlan, WorkoutDay, WorkoutExercise } from '../services/workoutPlan.service';

interface Props {
  onBack: () => void;
  onSaved: () => void;
  editingPlan?: WorkoutPlan | null;
}

const emptyExercise = (): WorkoutExercise => ({ name: '', sets: '', reps: '', rest: '', notes: '' });
const emptyDay = (n: number): WorkoutDay => ({ title: `Day ${n}`, exercises: [emptyExercise()] });

export default function AddWorkoutPlanScreen({ onBack, onSaved, editingPlan }: Props) {
  const insets = useSafeAreaInsets();
  const { isDark, palette } = useTheme();
  const accent = isDark ? palette.accent : '#006666';

  const [name, setName] = useState(editingPlan?.name || '');
  const [days, setDays] = useState<WorkoutDay[]>(editingPlan?.days?.length ? editingPlan.days : [emptyDay(1)]);
  const [notes, setNotes] = useState(editingPlan?.notes || '');
  const [saving, setSaving] = useState(false);

  const isEditing = !!editingPlan;

  const updateDayTitle = (dayIndex: number, title: string) => {
    setDays((prev) => prev.map((d, i) => (i === dayIndex ? { ...d, title } : d)));
  };

  const updateExercise = (dayIndex: number, exIndex: number, field: keyof WorkoutExercise, value: string) => {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIndex
          ? { ...d, exercises: d.exercises.map((ex, j) => (j === exIndex ? { ...ex, [field]: value } : ex)) }
          : d
      )
    );
  };

  const addExercise = (dayIndex: number) => {
    setDays((prev) => prev.map((d, i) => (i === dayIndex ? { ...d, exercises: [...d.exercises, emptyExercise()] } : d)));
  };

  const removeExercise = (dayIndex: number, exIndex: number) => {
    setDays((prev) =>
      prev.map((d, i) => (i === dayIndex ? { ...d, exercises: d.exercises.filter((_, j) => j !== exIndex) } : d))
    );
  };

  const addDay = () => setDays((prev) => [...prev, emptyDay(prev.length + 1)]);
  const removeDay = (dayIndex: number) => setDays((prev) => prev.filter((_, i) => i !== dayIndex));

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a plan name.');
      return;
    }

    setSaving(true);
    try {
      const input = { name: name.trim(), days, notes };
      if (isEditing && editingPlan) {
        await updateWorkoutPlan(editingPlan._id, input);
      } else {
        await createWorkoutPlan(input);
      }
      onSaved();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not save workout plan');
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
          <Text style={[styles.topTitle, { color: palette.topBarText }]}>
            {isEditing ? 'Edit Workout Plan' : 'Add Workout Plan'}
          </Text>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 40 }}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Workout Plan Details</Text>
          <View style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
            <TextInput
              style={[styles.plainInput, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.text }]}
              placeholder="Plan Name"
              placeholderTextColor={palette.textFaint}
              value={name}
              onChangeText={setName}
            />
          </View>

          <Text style={[styles.sectionTitle, { color: palette.text, marginTop: 20 }]}>Workout Days</Text>
          {days.map((day, dayIndex) => (
            <View key={dayIndex} style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
              <View style={styles.dayHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: palette.textMuted }]}>Day Title</Text>
                  <TextInput
                    style={[styles.plainInput, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.text }]}
                    value={day.title}
                    onChangeText={(v) => updateDayTitle(dayIndex, v)}
                  />
                </View>
                {days.length > 1 && (
                  <Pressable onPress={() => removeDay(dayIndex)} hitSlop={8} style={styles.removeDayBtn}>
                    <Ionicons name="trash-outline" size={18} color={palette.textMuted} />
                  </Pressable>
                )}
              </View>

              <Text style={[styles.subLabel, { color: accent, marginTop: 16 }]}>Exercises</Text>

              {day.exercises.map((ex, exIndex) => (
                <View key={exIndex} style={[styles.exerciseBlock, { borderColor: palette.cardBorder }]}>
                  {day.exercises.length > 1 && (
                    <Pressable
                      onPress={() => removeExercise(dayIndex, exIndex)}
                      hitSlop={8}
                      style={styles.removeExerciseBtn}
                    >
                      <Ionicons name="close-circle" size={18} color={palette.textFaint} />
                    </Pressable>
                  )}
                  <TextInput
                    style={[styles.plainInput, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.text }]}
                    placeholder="Exercise"
                    placeholderTextColor={palette.textFaint}
                    value={ex.name}
                    onChangeText={(v) => updateExercise(dayIndex, exIndex, 'name', v)}
                  />
                  <View style={styles.threeColRow}>
                    <TextInput
                      style={[styles.smallInput, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.text }]}
                      placeholder="Sets"
                      placeholderTextColor={palette.textFaint}
                      value={ex.sets}
                      onChangeText={(v) => updateExercise(dayIndex, exIndex, 'sets', v)}
                    />
                    <TextInput
                      style={[styles.smallInput, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.text }]}
                      placeholder="Reps"
                      placeholderTextColor={palette.textFaint}
                      value={ex.reps}
                      onChangeText={(v) => updateExercise(dayIndex, exIndex, 'reps', v)}
                    />
                    <TextInput
                      style={[styles.smallInput, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.text }]}
                      placeholder="Rest"
                      placeholderTextColor={palette.textFaint}
                      value={ex.rest}
                      onChangeText={(v) => updateExercise(dayIndex, exIndex, 'rest', v)}
                    />
                  </View>
                  <TextInput
                    style={[styles.plainInput, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.text }]}
                    placeholder="Notes"
                    placeholderTextColor={palette.textFaint}
                    value={ex.notes}
                    onChangeText={(v) => updateExercise(dayIndex, exIndex, 'notes', v)}
                  />
                </View>
              ))}

              <Pressable style={[styles.addLinkBtn, { borderColor: accent }]} onPress={() => addExercise(dayIndex)}>
                <Ionicons name="add" size={16} color={accent} />
                <Text style={[styles.addLinkBtnText, { color: accent }]}>Add Exercise</Text>
              </Pressable>
            </View>
          ))}

          <Pressable style={[styles.addLinkBtn, { borderColor: accent }]} onPress={addDay}>
            <Ionicons name="add" size={16} color={accent} />
            <Text style={[styles.addLinkBtnText, { color: accent }]}>Add Day</Text>
          </Pressable>

          <Text style={[styles.sectionTitle, { color: palette.text, marginTop: 20 }]}>Notes</Text>
          <View style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
            <TextInput
              style={[
                styles.plainInput,
                { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.text, height: 90, textAlignVertical: 'top', paddingTop: 12 },
              ]}
              placeholder="Overall plan notes (optional)"
              placeholderTextColor={palette.textFaint}
              multiline
              value={notes}
              onChangeText={setNotes}
            />
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

  sectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 10 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14 },
  fieldLabel: { fontSize: 11.5, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.3 },
  subLabel: { fontSize: 13, fontWeight: '800', marginBottom: 4 },

  plainInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 14.5, marginTop: 10 },
  smallInput: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, height: 48, fontSize: 14 },
  threeColRow: { flexDirection: 'row', gap: 8, marginTop: 10 },

  dayHeaderRow: { flexDirection: 'row', alignItems: 'flex-end' },
  removeDayBtn: { padding: 8, marginLeft: 8 },

  exerciseBlock: { borderTopWidth: 1, paddingTop: 14, marginTop: 14 },
  removeExerciseBtn: { position: 'absolute', top: 12, right: 0, zIndex: 1 },

  addLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    marginBottom: 14,
  },
  addLinkBtnText: { fontSize: 13.5, fontWeight: '700' },

  saveBtn: { marginTop: 10, paddingVertical: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});

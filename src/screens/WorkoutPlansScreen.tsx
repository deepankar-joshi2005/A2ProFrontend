import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, StyleSheet, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { listWorkoutPlans, deleteWorkoutPlan, WorkoutPlan } from '../services/workoutPlan.service';

interface Props {
  onBack: () => void;
  onAddPlan: () => void;
  onEditPlan: (plan: WorkoutPlan) => void;
}

export default function WorkoutPlansScreen({ onBack, onAddPlan, onEditPlan }: Props) {
  const insets = useSafeAreaInsets();
  const { isDark, palette } = useTheme();
  const accent = isDark ? palette.accent : '#006666';

  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await listWorkoutPlans();
      setPlans(data);
    } catch (err) {
      console.error('Error loading workout plans:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = (plan: WorkoutPlan) => {
    Alert.alert('Delete Workout Plan', `Remove "${plan.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteWorkoutPlan(plan._id);
            setPlans((prev) => prev.filter((p) => p._id !== plan._id));
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Could not delete workout plan');
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <StatusBar style="light" />

      <View style={[styles.topBar, { backgroundColor: palette.topBarBg }]}>
        <Pressable onPress={onBack} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={palette.topBarText} />
        </Pressable>
        <Text style={[styles.topTitle, { color: palette.topBarText }]}>Workout Plans</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={accent}
          />
        }
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={accent} />
          </View>
        ) : plans.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="barbell-outline" size={52} color={palette.textFaint} />
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>No workout plans yet.</Text>
            <Pressable style={[styles.emptyAddBtn, { backgroundColor: accent }]} onPress={onAddPlan}>
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.emptyAddBtnText}>Add Workout Plan</Text>
            </Pressable>
          </View>
        ) : (
          plans.map((plan) => {
            const expanded = expandedId === plan._id;
            return (
              <View key={plan._id} style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
                <Pressable
                  style={styles.accordionHeader}
                  onPress={() => setExpandedId(expanded ? null : plan._id)}
                >
                  <View style={[styles.planIcon, { backgroundColor: accent }]}>
                    <Ionicons name="barbell-outline" size={18} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.planName, { color: palette.text }]}>{plan.name}</Text>
                    <Text style={[styles.metaText, { color: palette.textMuted }]}>
                      {plan.days.length} day{plan.days.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <Pressable onPress={() => onEditPlan(plan)} hitSlop={8} style={styles.iconBtn}>
                    <Ionicons name="create-outline" size={20} color={accent} />
                  </Pressable>
                  <Pressable onPress={() => handleDelete(plan)} hitSlop={8} style={styles.iconBtn}>
                    <Ionicons name="trash-outline" size={20} color={palette.textMuted} />
                  </Pressable>
                  <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={palette.textFaint}
                    style={{ marginLeft: 6 }}
                  />
                </Pressable>

                {expanded && (
                  <View style={[styles.expandedArea, { borderTopColor: palette.cardBorder }]}>
                    {plan.days.map((day, dayIdx) => (
                      <View key={dayIdx} style={styles.dayBlock}>
                        <Text style={[styles.dayTitle, { color: accent }]}>{day.title || `Day ${dayIdx + 1}`}</Text>
                        {day.exercises.length === 0 ? (
                          <Text style={[styles.metaText, { color: palette.textMuted }]}>No exercises added.</Text>
                        ) : (
                          day.exercises.map((ex, exIdx) => (
                            <View key={exIdx} style={[styles.exerciseRow, { borderBottomColor: palette.cardBorder }]}>
                              <Text style={[styles.exerciseName, { color: palette.text }]}>{ex.name || 'Exercise'}</Text>
                              <Text style={[styles.exerciseMeta, { color: palette.textMuted }]}>
                                {[ex.sets && `${ex.sets} sets`, ex.reps && `${ex.reps} reps`, ex.rest && `${ex.rest} rest`]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </Text>
                              {!!ex.notes && (
                                <Text style={[styles.exerciseNotes, { color: palette.textFaint }]}>{ex.notes}</Text>
                              )}
                            </View>
                          ))
                        )}
                      </View>
                    ))}
                    {!!plan.notes && (
                      <View style={{ marginTop: 6 }}>
                        <Text style={[styles.dayTitle, { color: accent }]}>Notes</Text>
                        <Text style={[styles.exerciseMeta, { color: palette.textMuted }]}>{plan.notes}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Floating Add Button */}
      <Pressable
        onPress={onAddPlan}
        style={[styles.floatingAdd, { bottom: insets.bottom + 24, backgroundColor: accent }]}
      >
        <Ionicons name="add" size={18} color="#FFFFFF" />
        <Text style={styles.addPillText}>Add Workout Plan</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  center: { paddingVertical: 60, alignItems: 'center', justifyContent: 'center' },
  topBar: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 },
  backBtn: { padding: 4 },
  topTitle: { fontSize: 18, fontWeight: '800' },
  emptyWrap: { paddingVertical: 60, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, fontWeight: '500', textAlign: 'center', paddingHorizontal: 24 },

  card: { borderRadius: 16, borderWidth: 1, marginBottom: 14, overflow: 'hidden' },
  accordionHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  planIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  planName: { fontSize: 15.5, fontWeight: '800' },
  metaText: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  iconBtn: { padding: 4, marginLeft: 6 },

  expandedArea: { borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 14 },
  dayBlock: { marginBottom: 14 },
  dayTitle: { fontSize: 13.5, fontWeight: '800', marginBottom: 8 },
  exerciseRow: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  exerciseName: { fontSize: 14, fontWeight: '700' },
  exerciseMeta: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  exerciseNotes: { fontSize: 11.5, fontStyle: 'italic', marginTop: 2 },

  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  headerAddBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 20,
  },
  emptyAddBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  floatingAdd: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 28,
    elevation: 6,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  addPillText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});

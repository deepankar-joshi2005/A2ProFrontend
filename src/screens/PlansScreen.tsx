import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, StyleSheet, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { listAllPlans, deletePlan, MembershipPlan } from '../services/member.service';

interface Props {
  onBack: () => void;
  onAddPlan: () => void;
  onEditPlan: (plan: MembershipPlan) => void;
}

const formatINR = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

const durationLabel = (plan: MembershipPlan) =>
  plan.durationUnit === 'months'
    ? `${plan.durationValue} Month${plan.durationValue > 1 ? 's' : ''}`
    : `${plan.durationValue} Day${plan.durationValue > 1 ? 's' : ''}`;

export default function PlansScreen({ onBack, onAddPlan, onEditPlan }: Props) {
  const insets = useSafeAreaInsets();
  const { isDark, palette } = useTheme();
  const accent = isDark ? palette.accent : '#006666';

  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = await listAllPlans();
      setPlans(data);
    } catch (err) {
      console.error('Error loading plans:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = (plan: MembershipPlan) => {
    Alert.alert('Delete Plan', `Remove "${plan.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePlan(plan._id);
            setPlans((prev) => prev.filter((p) => p._id !== plan._id));
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Could not delete plan');
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
        <Text style={[styles.topTitle, { color: palette.topBarText }]}>Plans</Text>
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
            <Ionicons name="card-outline" size={52} color={palette.textFaint} />
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>No membership plans yet.</Text>
            <Pressable style={[styles.emptyAddBtn, { backgroundColor: accent }]} onPress={onAddPlan}>
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.emptyAddBtnText}>Add Plan</Text>
            </Pressable>
          </View>
        ) : (
          plans.map((plan) => (
            <View key={plan._id} style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
              <View style={styles.cardHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Plan Name</Text>
                  <Text style={[styles.planName, { color: palette.text }]}>{plan.name}</Text>
                </View>
                <Pressable onPress={() => onEditPlan(plan)} hitSlop={8} style={styles.iconBtn}>
                  <Ionicons name="create-outline" size={20} color={accent} />
                </Pressable>
                <Pressable onPress={() => handleDelete(plan)} hitSlop={8} style={styles.iconBtn}>
                  <Ionicons name="trash-outline" size={20} color={palette.textMuted} />
                </Pressable>
              </View>

              <View style={[styles.divider, { backgroundColor: palette.cardBorder }]} />

              <View style={styles.twoColRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Complete Amount</Text>
                  <Text style={[styles.valueText, { color: palette.text }]}>{formatINR(plan.amount)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Duration</Text>
                  <Text style={[styles.valueText, { color: palette.text }]}>{durationLabel(plan)}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Floating Add Button */}
      <Pressable
        onPress={onAddPlan}
        style={[styles.floatingAdd, { bottom: insets.bottom + 24, backgroundColor: accent }]}
      >
        <Ionicons name="add" size={18} color="#FFFFFF" />
        <Text style={styles.addPillText}>Add Plan</Text>
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
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 4, marginLeft: 10 },
  labelSmall: { fontSize: 11.5, fontWeight: '600', marginBottom: 3 },
  planName: { fontSize: 17, fontWeight: '800' },
  divider: { height: 1, marginVertical: 12 },
  twoColRow: { flexDirection: 'row' },
  valueText: { fontSize: 14.5, fontWeight: '700' },
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

import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, StyleSheet, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { listServicePlans, deleteServicePlan, ServicePlan } from '../services/servicePlan.service';

interface Props {
  onBack: () => void;
  onAddService: () => void;
  onEditService: (service: ServicePlan) => void;
}

const formatINR = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

export default function GymServicesScreen({ onBack, onAddService, onEditService }: Props) {
  const insets = useSafeAreaInsets();
  const { isDark, palette } = useTheme();
  const accent = isDark ? palette.accent : '#006666';

  const [services, setServices] = useState<ServicePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = await listServicePlans();
      setServices(data);
    } catch (err) {
      console.error('Error loading gym services:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = (service: ServicePlan) => {
    Alert.alert('Delete Service', `Remove "${service.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteServicePlan(service._id);
            setServices((prev) => prev.filter((s) => s._id !== service._id));
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Could not delete service');
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
        <Text style={[styles.topTitle, { color: palette.topBarText }]}>Gym Services</Text>
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
        ) : services.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="storefront-outline" size={52} color={palette.textFaint} />
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>No gym services yet.</Text>
            <Pressable style={[styles.emptyAddBtn, { backgroundColor: accent }]} onPress={onAddService}>
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.emptyAddBtnText}>Add Service</Text>
            </Pressable>
          </View>
        ) : (
          services.map((service) => (
            <View key={service._id} style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Service Name</Text>
                <Text style={[styles.planName, { color: palette.text }]}>{service.name}</Text>
                <Text style={[styles.amountText, { color: palette.statusActiveText }]}>{formatINR(service.amount)}</Text>
              </View>
              <Pressable onPress={() => onEditService(service)} hitSlop={8} style={styles.iconBtn}>
                <Ionicons name="create-outline" size={20} color={accent} />
              </Pressable>
              <Pressable onPress={() => handleDelete(service)} hitSlop={8} style={styles.iconBtn}>
                <Ionicons name="trash-outline" size={20} color={palette.textMuted} />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>

      {/* Floating Add Button */}
      <Pressable
        onPress={onAddService}
        style={[styles.floatingAdd, { bottom: insets.bottom + 24, backgroundColor: accent }]}
      >
        <Ionicons name="add" size={18} color="#FFFFFF" />
        <Text style={styles.addPillText}>Add Service</Text>
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
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14 },
  iconBtn: { padding: 4, marginLeft: 10 },
  labelSmall: { fontSize: 11.5, fontWeight: '600', marginBottom: 3 },
  planName: { fontSize: 17, fontWeight: '800' },
  amountText: { fontSize: 14, fontWeight: '700', marginTop: 4 },
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

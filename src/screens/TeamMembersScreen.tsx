import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, StyleSheet, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { listTeamMembers, deleteTeamMember, TeamMember } from '../services/teamMember.service';

interface Props {
  onBack: () => void;
  onAddTeamMember: () => void;
  onEditTeamMember: (member: TeamMember) => void;
}

export default function TeamMembersScreen({ onBack, onAddTeamMember, onEditTeamMember }: Props) {
  const insets = useSafeAreaInsets();
  const { isDark, palette } = useTheme();
  const accent = isDark ? palette.accent : '#006666';

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = await listTeamMembers();
      setMembers(data);
    } catch (err) {
      console.error('Error loading team members:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = (member: TeamMember) => {
    Alert.alert('Remove Team Member', `Remove "${member.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTeamMember(member._id);
            setMembers((prev) => prev.filter((m) => m._id !== member._id));
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Could not remove team member');
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
        <Text style={[styles.topTitle, { color: palette.topBarText }]}>Team Members</Text>
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
        ) : members.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="people-outline" size={52} color={palette.textFaint} />
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>No team members yet.</Text>
            <Pressable style={[styles.emptyAddBtn, { backgroundColor: accent }]} onPress={onAddTeamMember}>
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.emptyAddBtnText}>Add Team Member</Text>
            </Pressable>
          </View>
        ) : (
          members.map((member) => (
            <View key={member._id} style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Name</Text>
                  <Text style={[styles.valueBold, { color: palette.text }]}>{member.name}</Text>
                </View>
                <Pressable onPress={() => onEditTeamMember(member)} hitSlop={8} style={styles.iconBtn}>
                  <Ionicons name="create-outline" size={20} color={accent} />
                </Pressable>
                <Pressable onPress={() => handleDelete(member)} hitSlop={8} style={styles.iconBtn}>
                  <Ionicons name="trash-outline" size={20} color={palette.textMuted} />
                </Pressable>
              </View>

              <Text style={[styles.labelSmall, { color: palette.textMuted, marginTop: 10 }]}>Email</Text>
              <Text style={[styles.value, { color: palette.text }]}>{member.email}</Text>

              <Text style={[styles.labelSmall, { color: palette.textMuted, marginTop: 10 }]}>Mobile</Text>
              <Text style={[styles.value, { color: palette.text }]}>
                {member.countryCode || '+91'}
                {member.mobile}
              </Text>

              {member.isTrainer && (
                <View style={[styles.trainerBadge, { backgroundColor: palette.statusActiveBg }]}>
                  <Text style={[styles.trainerBadgeText, { color: palette.statusActiveText }]}>Trainer Role</Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <Pressable
        onPress={onAddTeamMember}
        style={[styles.floatingAdd, { bottom: insets.bottom + 24, backgroundColor: accent }]}
      >
        <Ionicons name="add" size={18} color="#FFFFFF" />
        <Text style={styles.addPillText}>Add Team Member</Text>
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
  emptyText: { fontSize: 14, fontWeight: '600', textAlign: 'center', paddingHorizontal: 24 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  iconBtn: { padding: 4, marginLeft: 8 },
  labelSmall: { fontSize: 11.5, fontWeight: '600' },
  value: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  valueBold: { fontSize: 17, fontWeight: '800', marginTop: 2 },
  trainerBadge: { alignSelf: 'flex-start', marginTop: 12, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  trainerBadgeText: { fontSize: 12, fontWeight: '700' },
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

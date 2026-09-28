import { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, Pressable, Alert, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { usePermissions } from '../context/PermissionsContext';
import ConfirmDialog from '../components/ConfirmDialog';
import { listAllPlans } from '../services/member.service';
import { listPTPlans } from '../services/ptPlan.service';
import { listServicePlans } from '../services/servicePlan.service';
import { listBatches } from '../services/batch.service';
import { listWorkoutPlans } from '../services/workoutPlan.service';
import { listDietPlans } from '../services/dietPlan.service';

export type ManageTarget = 'plans' | 'ptPlans' | 'gymServices' | 'batches' | 'workoutPlans' | 'dietPlans';

interface Props {
  onLogout: () => void;
  onNavigateTab?: (tab: 'members' | 'dashboard' | 'reports' | 'gym') => void;
  onOpenManage?: (target: ManageTarget) => void;
  onOpenTeamMembers?: () => void;
  onOpenBusinessProfile?: () => void;
}

interface GymRowItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  target?: ManageTarget;
  isNew?: boolean;
  subtitle?: string;
  requires?: string;
  onPress?: () => void;
}

interface GymSection {
  title: string;
  items: GymRowItem[];
}

const showComingSoon = (label: string) => Alert.alert('Coming Soon', `${label} is not available yet.`);

export default function GymScreen({ onLogout, onNavigateTab, onOpenManage, onOpenTeamMembers, onOpenBusinessProfile }: Props) {
  const insets = useSafeAreaInsets();
  const { isDark, palette, toggleTheme } = useTheme();
  const { role } = usePermissions();
  const isStaff = role === 'staff';

  const [logoutVisible, setLogoutVisible] = useState(false);

  const [counts, setCounts] = useState({
    plans: 0,
    ptPlans: 0,
    gymServices: 0,
    batches: 0,
    workoutPlans: 0,
    dietPlans: 0,
  });

  useEffect(() => {
    Promise.all([listAllPlans(), listPTPlans(), listServicePlans(), listBatches(), listWorkoutPlans(), listDietPlans()])
      .then(([plans, ptPlans, gymServices, batches, workoutPlans, dietPlans]) => {
        setCounts({
          plans: plans.length,
          ptPlans: ptPlans.length,
          gymServices: gymServices.length,
          batches: batches.length,
          workoutPlans: workoutPlans.length,
          dietPlans: dietPlans.length,
        });
      })
      .catch(() => {});
  }, []);

  const SECTIONS_ALL: GymSection[] = [
    {
      title: 'Business Profile',
      items: [
        { icon: 'briefcase-outline', label: 'Business Profile', onPress: onOpenBusinessProfile },
      ],
    },
    {
      title: 'Manage Plans',
      items: [
        { icon: 'card-outline', label: `Membership Plans (${counts.plans})`, target: 'plans', requires: 'gymSetup.membershipPlans.view' },
        { icon: 'body-outline', label: `PT Plans (${counts.ptPlans})`, target: 'ptPlans', requires: 'ptPlans.view' },
        { icon: 'list-outline', label: `Gym Services (${counts.gymServices})`, target: 'gymServices', requires: 'services.view' },
        // No permission group covers these - always usable, same as admin.
        { icon: 'swap-horizontal-outline', label: `Batch Management (${counts.batches})`, target: 'batches' },
        { icon: 'barbell-outline', label: `Workout Plans (${counts.workoutPlans})`, target: 'workoutPlans' },
        { icon: 'nutrition-outline', label: `Diet Plans (${counts.dietPlans})`, target: 'dietPlans' },
      ],
    },
    {
      title: 'Account & Billing',
      items: [
        // Staff can never manage other staff logins/permissions - always hidden for staff.
        { icon: 'people-outline', label: 'Staff Login Management', requires: 'admin-only', onPress: onOpenTeamMembers },
      ],
    },
  ];

  // Every row shows for staff exactly as it does for admin, except the
  // handful marked admin-only (no staff can ever be granted those). Rows
  // tied to a real permission key stay visible; the destination screen is
  // what shows "Access Denied" if that staff lacks the permission.
  const SECTIONS: GymSection[] = SECTIONS_ALL
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !(isStaff && item.requires === 'admin-only')),
    }))
    .filter((section) => section.items.length > 0);

  const openMenu = () => setLogoutVisible(true);

  const handlePress = (item: GymRowItem) => {
    if (item.onPress) {
      item.onPress();
      return;
    }
    if (item.target && onOpenManage) {
      onOpenManage(item.target);
      return;
    }
    showComingSoon(item.label);
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {/* Top Bar Header */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <Image source={require('../../assets/A2ProLogo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.brandName, { color: palette.text }]}>Gym</Text>
        </View>
        <View style={styles.topIcons}>
          <Pressable onPress={toggleTheme} hitSlop={8}>
            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={palette.text} />
          </Pressable>
          <Pressable onPress={openMenu} hitSlop={8}>
            <Ionicons name="person-circle-outline" size={22} color={palette.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 120 }}>
        {SECTIONS.map((section) => (
          <GymSectionCard key={section.title} section={section} palette={palette} onPress={handlePress} />
        ))}
      </ScrollView>

      {/* Bottom Navigation Tab Bar - identical for staff and admin; each destination screen gates its own content */}
      <View style={[styles.tabBar, { backgroundColor: palette.tabBarBg, borderTopColor: palette.tabBarBorder, paddingBottom: insets.bottom || 10 }]}>
        <BottomTabItem icon="people-outline" label="Members" onPress={() => onNavigateTab?.('members')} palette={palette} />
        <BottomTabItem icon="pie-chart-outline" label="Dashboard" onPress={() => onNavigateTab?.('dashboard')} palette={palette} />
        <BottomTabItem icon="document-text-outline" label="Reports" onPress={() => onNavigateTab?.('reports')} palette={palette} />
        <BottomTabItem icon="business" label="Gym" active palette={palette} />
      </View>

      <ConfirmDialog
        visible={logoutVisible}
        variant="danger"
        icon="log-out-outline"
        title="Logout"
        message="Are you sure you want to logout?"
        confirmText="Logout"
        cancelText="Cancel"
        onCancel={() => setLogoutVisible(false)}
        onConfirm={() => {
          setLogoutVisible(false);
          onLogout();
        }}
      />
    </View>
  );
}

function GymSectionCard({
  section,
  palette,
  onPress,
}: {
  section: GymSection;
  palette: any;
  onPress: (item: GymRowItem) => void;
}) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={[styles.sectionTitle, { color: palette.text }]}>{section.title}</Text>
      <View style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
        {section.items.map((item, i) => (
          <Pressable
            key={item.label}
            style={[styles.row, i < section.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: palette.cardBorder }]}
            onPress={() => onPress(item)}
          >
            <View style={[styles.rowIcon, { backgroundColor: palette.accent }]}>
              <Ionicons name={item.icon} size={17} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={styles.rowLabelLine}>
                <Text style={[styles.rowLabel, { color: palette.text }]} numberOfLines={1}>
                  {item.label}
                </Text>
                {item.isNew && (
                  <View style={[styles.newBadge, { backgroundColor: palette.statusActiveBg }]}>
                    <Text style={[styles.newBadgeText, { color: palette.statusActiveText }]}>NEW</Text>
                  </View>
                )}
              </View>
              {item.subtitle && (
                <Text style={[styles.rowSubtitle, { color: palette.textMuted }]} numberOfLines={2}>
                  {item.subtitle}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.textFaint} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function BottomTabItem({
  icon,
  label,
  active,
  onPress,
  palette,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  onPress?: () => void;
  palette: any;
}) {
  return (
    <Pressable style={styles.tabItem} onPress={onPress}>
      <Ionicons name={icon} size={20} color={active ? palette.accent : palette.textMuted} />
      <Text style={[styles.tabLabel, { color: palette.textMuted }, active && { color: palette.accent, fontWeight: '700' }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 30, height: 30 },
  brandName: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  topIcons: { flexDirection: 'row', alignItems: 'center', gap: 16 },

  sectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 10, marginLeft: 2 },
  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14 },
  rowIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  rowLabelLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowLabel: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  rowSubtitle: { fontSize: 12, fontWeight: '500', marginTop: 3 },
  newBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  newBadgeText: { fontSize: 9.5, fontWeight: '800' },

  tabBar: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 10 },
  tabItem: { flex: 1, alignItems: 'center', gap: 3 },
  tabLabel: { fontSize: 11, fontWeight: '600' },
});

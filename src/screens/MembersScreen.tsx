import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  Pressable,
  FlatList,
  ScrollView,
  Switch,
  Modal,
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatDate } from '../utils/date';
import { BASE_URL } from '../config/api';

// Helper: handles both Cloudinary full URLs and legacy local paths
const getPhotoUri = (photoUrl: string | null): string | null => {
  if (!photoUrl) return null;
  if (photoUrl.startsWith('http')) return photoUrl;
  return `${BASE_URL}${photoUrl}`;
};
import {
  listMembers,
  listPlans,
  deleteMember,
  renewMemberPlan,
  toggleBlockMember,
  Member,
  MembershipPlan,
} from '../services/member.service';
import { punchAttendance } from '../services/attendance.service';
import OptionSheet, { SheetOption } from '../components/OptionSheet';
import IdCardModal from '../components/IdCardModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useTheme } from '../context/ThemeContext';
import { usePermissions } from '../context/PermissionsContext';
import AccessDenied from '../components/AccessDenied';

interface Props {
  onLogout: () => void;
  onAddMember: () => void;
  onNavigateTab?: (tab: 'members' | 'dashboard' | 'reports' | 'gym') => void;
  onOpenRenewPlanScreen?: (member: Member) => void;
  onOpenMemberDetail?: (member: Member) => void;
  initialStatusFilter?: string;
}

const showComingSoon = (label: string) => Alert.alert('Coming Soon', `${label} is not available yet.`);

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
};

// 19 Status options
const STATUS_OPTIONS: SheetOption[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Birthday Today', value: 'birthday_today' },
  { label: 'Frozen Membership', value: 'frozen' },
  { label: 'Unpaid', value: 'unpaid' },
  { label: 'Paid', value: 'paid' },
  { label: 'Expiring in 1-3 Days', value: 'expiring_1_3' },
  { label: 'Expiring in 4-7 Days', value: 'expiring_4_7' },
  { label: 'Expiring in 8-15 Days', value: 'expiring_8_15' },
  { label: 'Expiring Today', value: 'expiring_today' },
  { label: 'Biometric Registered', value: 'biometric_registered' },
  { label: 'PT Plan Expiring Today', value: 'pt_expiring_today' },
  { label: 'PT Plan Expiring (1-3d)', value: 'pt_expiring_1_3' },
  { label: 'PT Plan Expiring (4-7d)', value: 'pt_expiring_4_7' },
  { label: 'PT Plan Expiring (8-15d)', value: 'pt_expiring_8_15' },
  { label: 'Active PT Plans', value: 'active_pt' },
  { label: 'Expired PT Plans', value: 'expired_pt' },
  { label: 'Total PT Plans', value: 'total_pt' },
];

const SORT_OPTIONS: SheetOption[] = [
  { label: 'Needs Attention First', value: 'attention' },
  { label: 'Newly Joined Members First', value: 'newly_joined' },
  { label: 'Highest Due Amount First', value: 'highest_due' },
  { label: 'Expiring Membership First', value: 'expiring_first' },
  { label: 'Longest Membership Validity First', value: 'longest_validity' },
  { label: 'Newly Purchased Membership First', value: 'newly_purchased' },
  { label: 'Recently Updated Members First', value: 'recently_updated' },
];

const GENDER_OPTIONS: SheetOption[] = [
  { label: 'Select Gender', value: 'all' },
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
];

export default function MembersScreen({
  onLogout,
  onAddMember,
  onNavigateTab,
  onOpenRenewPlanScreen,
  onOpenMemberDetail,
  initialStatusFilter,
}: Props) {
  const insets = useSafeAreaInsets();
  const { isDark, palette, toggleTheme } = useTheme();
  const { role, can, guard } = usePermissions();
  const isStaff = role === 'staff';
  const canViewMembers = !isStaff || can('members.view');

  const [members, setMembers] = useState<Member[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchByIdOnly, setSearchByIdOnly] = useState(false);

  // Filters state
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter || 'all');
  const [sortMode, setSortMode] = useState('attention');
  const [planFilter, setPlanFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');

  // ID Card Modal State
  const [idCardMember, setIdCardMember] = useState<Member | null>(null);

  // Photo View Modal State
  const [photoViewMember, setPhotoViewMember] = useState<Member | null>(null);

  // Confirm dialogs state
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [blockTarget, setBlockTarget] = useState<Member | null>(null);

  useEffect(() => {
    if (initialStatusFilter) {
      setStatusFilter(initialStatusFilter);
    }
  }, [initialStatusFilter]);

  const [activeSheet, setActiveSheet] = useState<'status' | 'sort' | 'plan' | 'batch' | 'gender' | null>(null);

  const fetchMembers = async () => {
    try {
      const data = await listMembers();
      setMembers(data);
    } catch {
      Alert.alert('Error', 'Could not load members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canViewMembers) {
      setLoading(false);
      return;
    }
    fetchMembers();
    listPlans()
      .then((data) => setPlans(data))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const batchOptions: SheetOption[] = useMemo(() => {
    const set = new Set<string>();
    members.forEach((m) => {
      if (m.batchLabel && m.batchLabel !== 'No Batch Found') {
        set.add(m.batchLabel);
      }
    });
    const batchList = Array.from(set);
    return [
      { label: 'Select Batch', value: 'all' },
      ...batchList.map((b) => ({ label: b, value: b })),
    ];
  }, [members]);

  const planOptions: SheetOption[] = useMemo(() => [
    { label: 'All Plans', value: 'all' },
    ...plans.map((p) => ({ label: p.name, value: p._id })),
  ], [plans]);

  const filteredMembers = useMemo(() => {
    const now = Date.now();
    const MS_PER_DAY = 86400000;
    let list = [...members];

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((m) =>
        searchByIdOnly
          ? m.membershipId.toLowerCase().includes(q)
          : m.name.toLowerCase().includes(q) ||
            m.mobile.includes(q) ||
            m.membershipId.toLowerCase().includes(q)
      );
    }

    if (genderFilter !== 'all') {
      list = list.filter((m) => m.gender?.toLowerCase() === genderFilter.toLowerCase());
    }

    if (batchFilter !== 'all') {
      list = list.filter((m) => m.batchLabel === batchFilter);
    }

    if (planFilter !== 'all') {
      list = list.filter((m) => m.planId?._id === planFilter);
    }

    if (statusFilter !== 'all') {
      list = list.filter((m) => {
        const expiryMs = new Date(m.planExpiryDate || 0).getTime();
        const daysLeft = (expiryMs - now) / MS_PER_DAY;
        const isExpired = daysLeft < 0;
        const isPTPlan = m.planId?.name?.toLowerCase().includes('pt') || m.planId?.name?.toLowerCase().includes('personal');

        switch (statusFilter) {
          case 'active':
            return !isExpired;
          case 'inactive':
            return isExpired;
          case 'birthday_today': {
            if (!m.dob) return false;
            const d = new Date(m.dob);
            const nowD = new Date();
            return d.getDate() === nowD.getDate() && d.getMonth() === nowD.getMonth();
          }
          case 'frozen':
            return (m as any).isFrozen === true;
          case 'unpaid':
            return m.dueAmount > 0;
          case 'paid':
            return m.dueAmount === 0;
          case 'expiring_1_3':
            return daysLeft > 0 && daysLeft <= 3;
          case 'expiring_4_7':
            return daysLeft > 3 && daysLeft <= 7;
          case 'expiring_8_15':
            return daysLeft > 7 && daysLeft <= 15;
          case 'expiring_today':
            return daysLeft >= 0 && daysLeft <= 1;
          case 'biometric_registered':
            return true;
          case 'pt_expiring_today':
            return isPTPlan && daysLeft >= 0 && daysLeft <= 1;
          case 'pt_expiring_1_3':
            return isPTPlan && daysLeft > 0 && daysLeft <= 3;
          case 'pt_expiring_4_7':
            return isPTPlan && daysLeft > 3 && daysLeft <= 7;
          case 'pt_expiring_8_15':
            return isPTPlan && daysLeft > 7 && daysLeft <= 15;
          case 'active_pt':
            return isPTPlan && !isExpired;
          case 'expired_pt':
            return isPTPlan && isExpired;
          case 'total_pt':
            return isPTPlan;
          default:
            return true;
        }
      });
    }

    switch (sortMode) {
      case 'attention':
        list.sort((a, b) => {
          const score = (m: Member) => {
            const daysLeft = (new Date(m.planExpiryDate || 0).getTime() - now) / MS_PER_DAY;
            return (m.dueAmount > 0 ? 1000 : 0) + (daysLeft <= 7 ? 500 : 0) - daysLeft;
          };
          return score(b) - score(a);
        });
        break;
      case 'newly_joined':
        list.sort((a, b) => new Date(b.joiningDate).getTime() - new Date(a.joiningDate).getTime());
        break;
      case 'highest_due':
        list.sort((a, b) => b.dueAmount - a.dueAmount);
        break;
      case 'expiring_first':
        list.sort((a, b) => new Date(a.planExpiryDate || 0).getTime() - new Date(b.planExpiryDate || 0).getTime());
        break;
      case 'longest_validity':
        list.sort((a, b) => new Date(b.planExpiryDate || 0).getTime() - new Date(a.planExpiryDate || 0).getTime());
        break;
      case 'newly_purchased':
        list.sort((a, b) => new Date(b.createdAt || b.paymentDate || 0).getTime() - new Date(a.createdAt || a.paymentDate || 0).getTime());
        break;
      case 'recently_updated':
        list.sort((a, b) => new Date((b as any).updatedAt || b.createdAt || 0).getTime() - new Date((a as any).updatedAt || a.createdAt || 0).getTime());
        break;
      default:
        break;
    }

    return list;
  }, [members, searchQuery, searchByIdOnly, statusFilter, planFilter, batchFilter, genderFilter, sortMode]);

  const handleDelete = (member: Member) => setDeleteTarget(member);

  const confirmDelete = async () => {
    const member = deleteTarget;
    if (!member) return;
    setDeleteTarget(null);
    try {
      await deleteMember(member._id);
      setMembers((prev) => prev.filter((m) => m._id !== member._id));
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not delete member');
    }
  };

  const handlePunchAttendance = async (member: Member) => {
    try {
      const res = await punchAttendance(member._id);
      Alert.alert('Attendance Updated', `${res.message} for ${member.name}`);
      fetchMembers();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not record attendance');
    }
  };

  const handleToggleBlock = (member: Member) => setBlockTarget(member);

  const confirmToggleBlock = async () => {
    const member = blockTarget;
    if (!member) return;
    setBlockTarget(null);
    try {
      const updated = await toggleBlockMember(member._id);
      setMembers((prev) => prev.map((m) => (m._id === member._id ? { ...m, isBlocked: updated.isBlocked } : m)));
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not update member');
    }
  };

  const handleOpenRenew = (member: Member) => {
    if (onOpenRenewPlanScreen) {
      onOpenRenewPlanScreen(member);
    } else {
      Alert.alert('Renew Plan', `Renew plan for ${member.name}`);
    }
  };

  const openMenu = () => setLogoutVisible(true);

  const statusLabel = STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ?? 'All';
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sortMode)?.label ?? 'Needs Attention First';
  const planLabel = planOptions.find((o) => o.value === planFilter)?.label ?? 'All Plans';
  const batchLabel = batchOptions.find((o) => o.value === batchFilter)?.label ?? 'Select Batch';
  const genderLabel = GENDER_OPTIONS.find((o) => o.value === genderFilter)?.label ?? 'Select Gender';

  return (
    <View style={[styles.root, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <Image source={require('../../assets/A2ProLogo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.brandName, { color: palette.text }]}>Members</Text>
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

      {!canViewMembers ? (
        <AccessDenied palette={palette} />
      ) : (
        <>
      {/* Search Input Row */}
      <View style={[styles.searchRow, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder }]}>
        <Ionicons name="search-outline" size={18} color={palette.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: palette.text }]}
          placeholder="Search for 'Mobile'"
          placeholderTextColor={palette.textFaint}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <Text style={[styles.midLabel, { color: palette.textMuted }]}>M ID</Text>
        <Switch
          value={searchByIdOnly}
          onValueChange={setSearchByIdOnly}
          trackColor={{ false: '#3A3D46', true: palette.accent }}
          thumbColor="#FFFFFF"
        />
      </View>

      {/* Horizontally Scrollable Filter Chips Bar */}
      <View style={styles.chipBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScrollContainer}
        >
          <Pressable
            style={[
              styles.chip,
              { backgroundColor: palette.cardBg, borderColor: palette.cardBorder },
              statusFilter !== 'all' && { backgroundColor: palette.accent + '25', borderColor: palette.accent },
            ]}
            onPress={() => setActiveSheet('status')}
          >
            <Text
              style={[
                styles.chipText,
                { color: palette.textMuted },
                statusFilter !== 'all' && { color: palette.text, fontWeight: '700' },
              ]}
              numberOfLines={1}
            >
              {statusLabel}
            </Text>
            <Ionicons
              name="chevron-down"
              size={14}
              color={statusFilter !== 'all' ? palette.text : palette.textMuted}
            />
          </Pressable>

          <Pressable
            style={[
              styles.chip,
              { backgroundColor: palette.cardBg, borderColor: palette.cardBorder },
              sortMode !== 'attention' && { backgroundColor: palette.accent + '25', borderColor: palette.accent },
            ]}
            onPress={() => setActiveSheet('sort')}
          >
            <Text
              style={[
                styles.chipText,
                { color: palette.textMuted },
                sortMode !== 'attention' && { color: palette.text, fontWeight: '700' },
              ]}
              numberOfLines={1}
            >
              {sortLabel}
            </Text>
            <Ionicons
              name="chevron-down"
              size={14}
              color={sortMode !== 'attention' ? palette.text : palette.textMuted}
            />
          </Pressable>

          <Pressable
            style={[
              styles.chip,
              { backgroundColor: palette.cardBg, borderColor: palette.cardBorder },
              planFilter !== 'all' && { backgroundColor: palette.accent + '25', borderColor: palette.accent },
            ]}
            onPress={() => setActiveSheet('plan')}
          >
            <Text
              style={[
                styles.chipText,
                { color: palette.textMuted },
                planFilter !== 'all' && { color: palette.text, fontWeight: '700' },
              ]}
              numberOfLines={1}
            >
              {planLabel}
            </Text>
            <Ionicons
              name="chevron-down"
              size={14}
              color={planFilter !== 'all' ? palette.text : palette.textMuted}
            />
          </Pressable>

          <Pressable
            style={[
              styles.chip,
              { backgroundColor: palette.cardBg, borderColor: palette.cardBorder },
              batchFilter !== 'all' && { backgroundColor: palette.accent + '25', borderColor: palette.accent },
            ]}
            onPress={() => setActiveSheet('batch')}
          >
            <Text
              style={[
                styles.chipText,
                { color: palette.textMuted },
                batchFilter !== 'all' && { color: palette.text, fontWeight: '700' },
              ]}
              numberOfLines={1}
            >
              {batchLabel}
            </Text>
            <Ionicons
              name="chevron-down"
              size={14}
              color={batchFilter !== 'all' ? palette.text : palette.textMuted}
            />
          </Pressable>

          <Pressable
            style={[
              styles.chip,
              { backgroundColor: palette.cardBg, borderColor: palette.cardBorder },
              genderFilter !== 'all' && { backgroundColor: palette.accent + '25', borderColor: palette.accent },
            ]}
            onPress={() => setActiveSheet('gender')}
          >
            <Text
              style={[
                styles.chipText,
                { color: palette.textMuted },
                genderFilter !== 'all' && { color: palette.text, fontWeight: '700' },
              ]}
              numberOfLines={1}
            >
              {genderLabel}
            </Text>
            <Ionicons
              name="chevron-down"
              size={14}
              color={genderFilter !== 'all' ? palette.text : palette.textMuted}
            />
          </Pressable>
        </ScrollView>
      </View>

      {/* Main Content / Members List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={palette.accent} size="large" />
        </View>
      ) : members.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={48} color={palette.textFaint} />
          <Text style={[styles.emptyText, { color: palette.textMuted }]}>No members yet</Text>
          <Pressable onPress={() => guard('members.add', onAddMember)}>
            <LinearGradient
              colors={palette.gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addPill}
            >
              <Ionicons name="person-add-outline" size={18} color="#FFFFFF" />
              <Text style={styles.addPillText}>Add Member</Text>
            </LinearGradient>
          </Pressable>
        </View>
      ) : filteredMembers.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: palette.textMuted }]}>No members match your filters.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredMembers}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 140 }}
          renderItem={({ item }) => (
            <MemberCard
              member={item}
              onDelete={() => handleDelete(item)}
              onOpenIdCard={() => setIdCardMember(item)}
              onPunchAttendance={() => handlePunchAttendance(item)}
              onOpenRenewPlan={() => handleOpenRenew(item)}
              onToggleBlock={() => handleToggleBlock(item)}
              onOpenDetail={() => onOpenMemberDetail?.(item)}
              onPhotoPress={() => setPhotoViewMember(item)}
              palette={palette}
            />
          )}
        />
      )}
        </>
      )}

      {/* Floating Add Button */}
      {(!canViewMembers || members.length > 0) && (
        <Pressable onPress={() => guard('members.add', onAddMember)} style={[styles.floatingAdd, { bottom: insets.bottom + 76 }]}>
          <LinearGradient
            colors={palette.gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.addPill}
          >
            <Ionicons name="person-add-outline" size={18} color="#FFFFFF" />
            <Text style={styles.addPillText}>Add Member</Text>
          </LinearGradient>
        </Pressable>
      )}

      {/* Bottom Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: palette.tabBarBg, borderTopColor: palette.tabBarBorder, paddingBottom: insets.bottom || 10 }]}>
        <TabItem icon="people" label="Members" active palette={palette} />
        <TabItem icon="pie-chart-outline" label="Dashboard" onPress={() => onNavigateTab ? onNavigateTab('dashboard') : showComingSoon('Dashboard')} palette={palette} />
        <TabItem icon="document-text-outline" label="Reports" onPress={() => onNavigateTab ? onNavigateTab('reports') : showComingSoon('Reports')} palette={palette} />
        <TabItem icon="business-outline" label="Gym" onPress={() => onNavigateTab ? onNavigateTab('gym') : showComingSoon('Gym')} palette={palette} />
      </View>

      {/* Filter Option Sheets */}
      <OptionSheet
        visible={activeSheet === 'status'}
        options={STATUS_OPTIONS}
        selectedValue={statusFilter}
        onSelect={setStatusFilter}
        onClose={() => setActiveSheet(null)}
      />
      <OptionSheet
        visible={activeSheet === 'sort'}
        options={SORT_OPTIONS}
        selectedValue={sortMode}
        onSelect={setSortMode}
        onClose={() => setActiveSheet(null)}
      />
      <OptionSheet
        visible={activeSheet === 'plan'}
        options={planOptions}
        selectedValue={planFilter}
        onSelect={setPlanFilter}
        onClose={() => setActiveSheet(null)}
      />
      <OptionSheet
        visible={activeSheet === 'batch'}
        options={batchOptions}
        selectedValue={batchFilter}
        onSelect={setBatchFilter}
        onClose={() => setActiveSheet(null)}
      />
      <OptionSheet
        visible={activeSheet === 'gender'}
        options={GENDER_OPTIONS}
        selectedValue={genderFilter}
        onSelect={setGenderFilter}
        onClose={() => setActiveSheet(null)}
      />

      <IdCardModal member={idCardMember} visible={!!idCardMember} onClose={() => setIdCardMember(null)} />

      {/* ── Photo View Modal (WhatsApp style) ── */}
      <Modal
        visible={!!photoViewMember}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoViewMember(null)}
        statusBarTranslucent
      >
        <Pressable style={photoStyles.overlay} onPress={() => setPhotoViewMember(null)}>
          {/* Top bar */}
          <View style={photoStyles.topBar}>
            <View style={[photoStyles.smallAvatar, { backgroundColor: palette.accent }]}>
              <Text style={photoStyles.smallAvatarText}>
                {photoViewMember?.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={photoStyles.name} numberOfLines={1}>{photoViewMember?.name}</Text>
            <Pressable onPress={() => setPhotoViewMember(null)} hitSlop={12}>
              <Ionicons name="close" size={26} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Big round photo */}
          <View style={photoStyles.center}>
            {photoViewMember?.photoUrl ? (
              <Image
                source={{ uri: `getPhotoUri(photoViewMember.photoUrl)!` }}
                style={photoStyles.bigImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[photoStyles.bigImage, { backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ color: '#FFF', fontSize: 72, fontWeight: '800' }}>
                  {photoViewMember?.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </Pressable>
      </Modal>

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

      <ConfirmDialog
        visible={!!deleteTarget}
        variant="danger"
        icon="trash-outline"
        title="Delete Member"
        message={deleteTarget ? `Remove ${deleteTarget.name} from members?` : undefined}
        confirmText="Delete"
        cancelText="Cancel"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        visible={!!blockTarget}
        variant={blockTarget && !blockTarget.isBlocked ? 'danger' : 'success'}
        icon={blockTarget && !blockTarget.isBlocked ? 'ban-outline' : 'checkmark-circle-outline'}
        title={blockTarget && !blockTarget.isBlocked ? 'Block Member' : 'Unblock Member'}
        message={
          blockTarget
            ? !blockTarget.isBlocked
              ? `Block ${blockTarget.name}? They won't be able to log in until unblocked.`
              : `Unblock ${blockTarget.name}? They will be able to log in again.`
            : undefined
        }
        confirmText={blockTarget && !blockTarget.isBlocked ? 'Block' : 'Unblock'}
        cancelText="Cancel"
        onCancel={() => setBlockTarget(null)}
        onConfirm={confirmToggleBlock}
      />
    </View>
  );
}

function TabItem({
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
      <Text style={[styles.tabLabel, { color: palette.textMuted }, active && { color: palette.accent, fontWeight: '700' }]}>{label}</Text>
    </Pressable>
  );
}

function MemberCard({
  member,
  onDelete,
  onOpenIdCard,
  onPunchAttendance,
  onOpenRenewPlan,
  onToggleBlock,
  onOpenDetail,
  onPhotoPress,
  palette,
}: {
  member: Member;
  onDelete: () => void;
  onOpenIdCard: () => void;
  onPunchAttendance: () => void;
  onOpenRenewPlan: () => void;
  onToggleBlock: () => void;
  onOpenDetail: () => void;
  onPhotoPress: () => void;
  palette: any;
}) {
  const actions: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }[] = [
    { icon: 'card-outline', label: 'ID Card', onPress: onOpenIdCard },
    { icon: 'call-outline', label: 'Call', onPress: () => Linking.openURL(`tel:${member.mobile}`) },
    {
      icon: 'logo-whatsapp',
      label: 'Whatsapp',
      onPress: () => Linking.openURL(`https://wa.me/91${member.mobile}`),
    },
    { icon: 'finger-print-outline', label: 'Attendance', onPress: onPunchAttendance },
    { icon: 'refresh-outline', label: 'Renew Plan', onPress: onOpenRenewPlan },
    { icon: 'ban-outline', label: member.isBlocked ? 'Unblock' : 'Block', onPress: onToggleBlock },
  ];

  return (
    <Pressable
      onPress={onOpenDetail}
      style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}
    >
      <View style={[styles.cardAccent, { backgroundColor: palette.accent }]} />
      <Pressable
        style={styles.cardTrash}
        onPress={onDelete}
        hitSlop={8}
        testID={`delete-member-${member._id}`}
      >
        <Ionicons name="trash-outline" size={16} color={palette.textMuted} />
      </Pressable>

      <View style={styles.cardHeader}>
        <Pressable
          onPress={onPhotoPress}
          hitSlop={4}
          style={[styles.avatar, { backgroundColor: palette.accentDeep }]}
        >
          {member.photoUrl ? (
            <Image
              source={{ uri: `getPhotoUri(member.photoUrl)!` }}
              style={{ width: 54, height: 54, borderRadius: 27 }}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.avatarText}>{getInitials(member.name).toUpperCase()}</Text>
          )}
        </Pressable>
        <View style={styles.cardFields}>
          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, { color: palette.textFaint }]}>Name:</Text>
            <Text style={[styles.fieldValue, { color: palette.text }]} numberOfLines={1}>{member.name}</Text>
          </View>
          <View style={styles.fieldRow}>
            <View style={[styles.fieldBlock, styles.fieldCol]}>
              <Text style={[styles.fieldLabel, { color: palette.textFaint }]}>M ID</Text>
              <Text style={[styles.fieldValue, { color: palette.text }]}>{member.membershipId}</Text>
            </View>
            <View style={[styles.fieldBlock, styles.fieldCol]}>
              <Text style={[styles.fieldLabel, styles.nudgeRight, { color: palette.textFaint }]}>Mobile:</Text>
              <Text
                style={[styles.fieldValue, styles.alignRight, { color: palette.text }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                +91 - {member.mobile}
              </Text>
            </View>
          </View>
          <View style={styles.fieldRow}>
            <View style={[styles.fieldBlock, styles.fieldCol]}>
              <Text style={[styles.fieldLabel, { color: palette.textFaint }]}>Plan Expiry:</Text>
              <Text style={[styles.fieldValue, { color: palette.text }]} numberOfLines={1}>{formatDate(member.planExpiryDate)}</Text>
            </View>
            <View style={[styles.fieldBlock, styles.fieldCol]}>
              <Text style={[styles.fieldLabel, styles.alignRight, { color: palette.textFaint }]}>Due Amount:</Text>
              <Text
                style={[styles.fieldValue, styles.nudgeRight, { color: palette.text }, member.dueAmount > 0 && { color: palette.accent }]}
                numberOfLines={1}
              >
                ₹{member.dueAmount}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.cardDivider, { backgroundColor: palette.cardBorder }]} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.actionRow}
      >
        {actions.map((a) => (
          <Pressable key={a.label} style={styles.actionBtn} onPress={a.onPress}>
            <Ionicons name={a.icon} size={19} color={palette.textMuted} />
            <Text style={[styles.actionLabel, { color: palette.textFaint }]} numberOfLines={1}>{a.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <LinearGradient
        colors={palette.gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.cardBottomAccent}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyText: { fontSize: 14, marginTop: 10, marginBottom: 20 },

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

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
  },
  searchInput: { flex: 1, fontSize: 14 },
  midLabel: { fontSize: 11, fontWeight: '700', marginRight: 6 },

  chipBarWrapper: {
    marginTop: 12,
    marginBottom: 4,
  },
  chipScrollContainer: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  chipText: { fontSize: 12, fontWeight: '600' },

  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 28,
    elevation: 6,
  },
  addPillText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  floatingAdd: { position: 'absolute', right: 16 },

  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 10,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 3 },
  tabLabel: { fontSize: 11, fontWeight: '600' },

  card: {
    borderWidth: 1,
    borderRadius: 18,
    marginBottom: 18,
    overflow: 'hidden',
    paddingLeft: 14,
  },
  cardAccent: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 4 },
  cardTrash: { position: 'absolute', top: 16, right: 16, zIndex: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: 18, paddingBottom: 16, paddingRight: 36 },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 6,
  },
  avatarText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  cardFields: { flex: 1, gap: 14 },
  fieldRow: { flexDirection: 'row', gap: 16 },
  fieldCol: { flex: 1 },
  fieldBlock: { gap: 3 },
  fieldLabel: { fontSize: 11, fontWeight: '600' },
  fieldValue: { fontWeight: '700', fontSize: 12.5 },
  alignRight: { textAlign: 'right' },
  nudgeRight: { paddingLeft: 18 },

  cardDivider: {
    height: 1,
    marginHorizontal: 14,
  },

  actionRow: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    gap: 6,
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    gap: 4,
  },
  actionLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  cardBottomAccent: {
    height: 3,
    width: '100%',
  },

  /* Modals Common */
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  modalBackdrop: {
    flex: 1,
  },

  /* Gym Pass / ID Card Modal Styles (Positioned just above bottom dashboard bar) */
  passModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 14,
    alignItems: 'center',
    marginHorizontal: 10,
    borderRadius: 24,
    borderWidth: 1,
    elevation: 10,
  },
  passModalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CCCCCC',
    marginBottom: 10,
  },
  passModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 14,
  },
  passModalTitle: {
    fontSize: 19,
    fontWeight: '900',
  },
  passCloseIconBtn: {
    padding: 4,
  },
  passTemplateRow: {
    flexDirection: 'row',
    width: '100%',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  passTemplateBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  passTemplateBtnActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  passTemplateText: {
    fontSize: 13,
    fontWeight: '600',
  },
  passTemplateTextActive: {
    color: '#006666',
    fontWeight: '800',
  },

  /* Pass Card Designs */
  passCard: {
    width: '100%',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  passBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  passGymName: {
    fontSize: 18,
    fontWeight: '900',
  },
  passOwnerName: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  passGymLogoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  passAvatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
  },
  passAvatarImage: {
    width: '100%',
    height: '100%',
  },
  passMemberName: {
    fontSize: 18,
    fontWeight: '900',
  },
  passMemberId: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  passDivider: {
    height: 1,
    marginBottom: 12,
  },
  passDetailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  passDetailCol: {
    minWidth: '45%',
  },
  passLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  passValueBold: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },

  passShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#006666',
    borderRadius: 14,
    width: '100%',
    height: 48,
    marginTop: 16,
  },
  passShareBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  passShareOldText: {
    color: '#006666',
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});

const photoStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 60,
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 16,
    gap: 12,
  },
  smallAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallAvatarText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  name: { flex: 1, color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bigImage: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.15)',
  },
});

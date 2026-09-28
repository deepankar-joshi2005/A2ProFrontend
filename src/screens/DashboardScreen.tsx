import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  StyleSheet,
  RefreshControl,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getDashboardStats,
  DashboardStats,
  getFinancialStats,
  FinancialStatsResponse,
  getAttendanceReport,
  AttendanceRecord,
  addBackDatedAttendance,
  getMonthlyAttendanceCounts,
  getMemberAttendanceHistory,
} from '../services/attendance.service';
import { listMembers, getMember, Member } from '../services/member.service';
import { useTheme } from '../context/ThemeContext';
import MonthPickerModal from '../components/MonthPickerModal';
import ConfirmDialog from '../components/ConfirmDialog';

const DateTimePicker =
  Platform.OS !== 'web' ? require('@react-native-community/datetimepicker').default : null;

interface Props {
  onLogout: () => void;
  onNavigateTab: (tab: 'members' | 'dashboard' | 'reports' | 'gym') => void;
  onOpenRecordAttendance: (tab?: 'attendance' | 'report') => void;
  onNavigateMembersWithFilter: (filterKey: string) => void;
  onNavigateAdmissionReport?: (from: Date, to: Date, periodLabel?: string) => void;
  onNavigateSalesReport?: (from: Date, to: Date) => void;
  onNavigatePendingPlanPayments?: (isPT: boolean, from: Date, to: Date, periodLabel?: string) => void;
  onNavigateManageExpense?: (from: Date, to: Date) => void;
  onNavigateServiceReport?: (type: 'paid' | 'due', from: Date, to: Date, periodLabel?: string) => void;
  onOpenMemberDetail?: (member: import('../services/member.service').Member) => void;
}

const showComingSoon = (label: string) => Alert.alert('Coming Soon', `${label} is not available yet.`);

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDateDisplay(d: Date): string {
  return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTime12h(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return 'N/A';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

export default function DashboardScreen({
  onLogout,
  onNavigateTab,
  onOpenRecordAttendance,
  onNavigateMembersWithFilter,
  onNavigateAdmissionReport,
  onNavigateSalesReport,
  onNavigatePendingPlanPayments,
  onNavigateManageExpense,
  onNavigateServiceReport,
  onOpenMemberDetail,
}: Props) {
  const insets = useSafeAreaInsets();
  const { isDark, palette, toggleTheme } = useTheme();

  const [logoutVisible, setLogoutVisible] = useState(false);
  const [topTab, setTopTab] = useState<'membership' | 'payments' | 'attendance'>('membership');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Payments Tab State
  const [financialStats, setFinancialStats] = useState<FinancialStatsResponse | null>(null);
  const [monthFilter, setMonthFilter] = useState<'this_month' | 'last_month' | 'last_3_months' | 'custom'>('this_month');
  const [yearFilter, setYearFilter] = useState<'this_year' | 'last_year' | 'lifetime' | 'custom'>('this_year');
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [selectedCustomYear, setSelectedCustomYear] = useState(new Date().getFullYear());
  const [selectedCustomMonth, setSelectedCustomMonth] = useState(new Date().getMonth());

  // Attendance Tab State
  const [selectedAttDate, setSelectedAttDate] = useState<Date>(new Date());
  const [calendarMonthDate, setCalendarMonthDate] = useState<Date>(new Date());
  const [attRecords, setAttRecords] = useState<AttendanceRecord[]>([]);
  const [attCounts, setAttCounts] = useState<Record<string, number>>({});
  const [attFilter, setAttFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [attLoading, setAttLoading] = useState(false);

  // Add Back-dated Modal state
  const [showAddBackDated, setShowAddBackDated] = useState(false);
  const [backDate, setBackDate] = useState<Date>(new Date());
  const [backTime, setBackTime] = useState<Date>(new Date());
  const [memberSearch, setMemberSearch] = useState('');
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [addingMemberId, setAddingMemberId] = useState<string | null>(null);

  // Date/Time pickers state for Back-dated Modal
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);

  // Member History Modal state
  const [historyMember, setHistoryMember] = useState<{ id: string; name: string } | null>(null);
  const [historyRecords, setHistoryRecords] = useState<AttendanceRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const now = new Date();
  const dateTodayString = formatDateDisplay(now);
  const monthYearString = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;

  const fetchStats = async () => {
    try {
      const [dashData, finData] = await Promise.all([
        getDashboardStats(),
        getFinancialStats(),
      ]);
      setStats(dashData);
      setFinancialStats(finData);
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAttendanceForSelectedDate = async (d: Date, calMonth: Date = calendarMonthDate) => {
    setAttLoading(true);
    try {
      const dateStr = formatDateStr(d);
      const [repRes, countsRes] = await Promise.all([
        getAttendanceReport(dateStr),
        getMonthlyAttendanceCounts(calMonth.getFullYear(), calMonth.getMonth() + 1),
      ]);
      setAttRecords(repRes.records || []);
      setAttCounts(countsRes || {});
    } catch (err) {
      console.error('Error loading attendance data:', err);
    } finally {
      setAttLoading(false);
    }
  };

  const loadMembersList = async () => {
    try {
      const list = await listMembers();
      setAllMembers(list);
    } catch (err) {
      console.error('Error loading members:', err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (topTab === 'attendance') {
      fetchAttendanceForSelectedDate(selectedAttDate, calendarMonthDate);
      loadMembersList();
    }
  }, [topTab, selectedAttDate, calendarMonthDate]);

  const openMenu = () => setLogoutVisible(true);

  const loadCustomFinancialStats = async (y: number, m: number) => {
    try {
      const fDate = new Date(y, m, 1);
      const tDate = new Date(y, m + 1, 0, 23, 59, 59);
      const res = await getFinancialStats(formatDateStr(fDate), formatDateStr(tDate));
      setFinancialStats(res);
    } catch (err) {
      console.error('Error fetching custom stats:', err);
    }
  };

  const getActiveMonthRange = (): { from: Date; to: Date; periodLabel: string } => {
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    if (monthFilter === 'last_month') {
      const startLastMonth = new Date(curYear, curMonth - 1, 1);
      const endLastMonth = new Date(curYear, curMonth, 0, 23, 59, 59);
      const label = `${SHORT_MONTHS[startLastMonth.getMonth()]} ${startLastMonth.getFullYear()}`;
      return { from: startLastMonth, to: endLastMonth, periodLabel: label };
    }
    if (monthFilter === 'last_3_months') {
      const start3Months = new Date(curYear, curMonth - 2, 1);
      const endThisMonth = new Date(curYear, curMonth + 1, 0, 23, 59, 59);
      return { from: start3Months, to: endThisMonth, periodLabel: 'Last 3 Months' };
    }
    if (monthFilter === 'custom') {
      const startCustom = new Date(selectedCustomYear, selectedCustomMonth, 1);
      const endCustom = new Date(selectedCustomYear, selectedCustomMonth + 1, 0, 23, 59, 59);
      const label = `${SHORT_MONTHS[selectedCustomMonth]} ${selectedCustomYear}`;
      return { from: startCustom, to: endCustom, periodLabel: label };
    }
    // this_month
    const startThisMonth = new Date(curYear, curMonth, 1);
    const label = `${SHORT_MONTHS[curMonth]} ${curYear}`;
    return { from: startThisMonth, to: now, periodLabel: label };
  };

  const getActiveYearRange = (): { from: Date; to: Date; periodLabel: string } => {
    const curYear = now.getFullYear();
    if (yearFilter === 'last_year') {
      const startLastYear = new Date(curYear - 1, 0, 1);
      const endLastYear = new Date(curYear - 1, 11, 31, 23, 59, 59);
      return { from: startLastYear, to: endLastYear, periodLabel: String(curYear - 1) };
    }
    if (yearFilter === 'lifetime') {
      const startLifetime = new Date(2000, 0, 1);
      return { from: startLifetime, to: now, periodLabel: 'Lifetime' };
    }
    if (yearFilter === 'custom') {
      const startCustom = new Date(selectedCustomYear, 0, 1);
      const endCustom = new Date(selectedCustomYear, 11, 31, 23, 59, 59);
      return { from: startCustom, to: endCustom, periodLabel: String(selectedCustomYear) };
    }
    // this_year
    const startThisYear = new Date(curYear, 0, 1);
    const endThisYear = new Date(curYear, 11, 31, 23, 59, 59);
    return { from: startThisYear, to: endThisYear, periodLabel: String(curYear) };
  };

  // Active month financial values based on filter
  const currentMonthData = useMemo(() => {
    if (!financialStats) return null;
    switch (monthFilter) {
      case 'last_month':
        return financialStats.lastMonth;
      case 'last_3_months':
        return financialStats.last3Months;
      case 'custom':
        return financialStats.custom || financialStats.thisMonth;
      case 'this_month':
      default:
        return financialStats.thisMonth;
    }
  }, [financialStats, monthFilter]);

  // Active year financial values based on filter
  const currentYearData = useMemo(() => {
    if (!financialStats) return null;
    switch (yearFilter) {
      case 'last_year':
        return financialStats.lastYear;
      case 'lifetime':
        return financialStats.lifetime;
      case 'this_year':
      default:
        return financialStats.thisYear;
    }
  }, [financialStats, yearFilter]);

  // Calendar 7-column grid cells for displayed month
  const gridCells = useMemo(() => {
    const year = calendarMonthDate.getFullYear();
    const month = calendarMonthDate.getMonth();

    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: { date: Date; dateNum: number; isCurrentMonth: boolean; dateStr: string }[] = [];

    // Previous month padding days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const prevDateNum = daysInPrevMonth - i;
      const d = new Date(year, month - 1, prevDateNum);
      cells.push({
        date: d,
        dateNum: prevDateNum,
        isCurrentMonth: false,
        dateStr: formatDateStr(d),
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      cells.push({
        date: d,
        dateNum: i,
        isCurrentMonth: true,
        dateStr: formatDateStr(d),
      });
    }

    // Next month padding days to complete 7-column rows
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      cells.push({
        date: d,
        dateNum: i,
        isCurrentMonth: false,
        dateStr: formatDateStr(d),
      });
    }

    return cells;
  }, [calendarMonthDate]);

  // Attendance filtered records for selected date
  const filteredAttRecords = useMemo(() => {
    const nowMs = Date.now();
    let list = attRecords;
    if (attFilter !== 'all') {
      list = list.filter((rec) => {
        const m = rec.memberId;
        if (!m) return false;
        const expiryMs = new Date(m.planExpiryDate).getTime();
        const isExpired = expiryMs < nowMs;
        return attFilter === 'expired' ? isExpired : !isExpired;
      });
    }
    return list;
  }, [attRecords, attFilter]);

  const attCountsSummary = useMemo(() => {
    const nowMs = Date.now();
    let total = attRecords.length;
    let active = 0;
    let expired = 0;
    attRecords.forEach((rec) => {
      const m = rec.memberId;
      if (m) {
        const isExp = new Date(m.planExpiryDate).getTime() < nowMs;
        if (isExp) expired++;
        else active++;
      }
    });
    return { total, active, expired };
  }, [attRecords]);

  // Back-dated modal member search list
  const filteredSearchMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return allMembers;
    return allMembers.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.mobile.includes(q) ||
        m.membershipId.toLowerCase().includes(q)
    );
  }, [allMembers, memberSearch]);

  const handleAddBackDated = async (member: Member) => {
    setAddingMemberId(member._id);
    try {
      const dateStr = formatDateStr(backDate);
      const combinedTime = new Date(backDate);
      combinedTime.setHours(backTime.getHours(), backTime.getMinutes(), 0, 0);

      await addBackDatedAttendance({
        memberId: member._id,
        dateStr,
        punchInTime: combinedTime.toISOString(),
      });

      setShowAddBackDated(false);
      fetchAttendanceForSelectedDate(selectedAttDate, calendarMonthDate);
      Alert.alert('Success', `Attendance recorded for ${member.name}`);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not add attendance');
    } finally {
      setAddingMemberId(null);
    }
  };

  const handleOpenMemberHistory = async (member: any) => {
    if (!member?._id) return;
    setHistoryMember({ id: member._id, name: member.name || 'Member' });
    setHistoryLoading(true);
    try {
      const recs = await getMemberAttendanceHistory(member._id);
      setHistoryRecords(recs);
    } catch (err) {
      console.error('Error fetching member history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {/* Top Bar Header */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <Image source={require('../../assets/A2ProLogo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.brandName, { color: palette.text }]}>Dashboard</Text>
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

      {/* Top Navigation Tabs */}
      <View style={[styles.topTabRow, { backgroundColor: isDark ? '#0F1015' : '#FFFFFF', borderBottomColor: palette.surfaceBorder }]}>
        <Pressable
          style={[styles.topTabBtn, topTab === 'membership' && { borderBottomColor: palette.accent }]}
          onPress={() => setTopTab('membership')}
        >
          <Text style={[styles.topTabText, { color: palette.textMuted }, topTab === 'membership' && { color: palette.text, fontWeight: '700' }]}>
            Membership
          </Text>
        </Pressable>
        <Pressable
          style={[styles.topTabBtn, topTab === 'payments' && { borderBottomColor: palette.accent }]}
          onPress={() => setTopTab('payments')}
        >
          <Text style={[styles.topTabText, { color: palette.textMuted }, topTab === 'payments' && { color: palette.text, fontWeight: '700' }]}>
            Payments
          </Text>
        </Pressable>
        <Pressable
          style={[styles.topTabBtn, topTab === 'attendance' && { borderBottomColor: palette.accent }]}
          onPress={() => setTopTab('attendance')}
        >
          <Text style={[styles.topTabText, { color: palette.textMuted }, topTab === 'attendance' && { color: palette.text, fontWeight: '700' }]}>
            Attendance
          </Text>
        </Pressable>
      </View>

      {/* Main Tab Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={palette.accent} />
        </View>
      ) : topTab === 'membership' ? (
        /* ==================== MEMBERSHIP TAB ==================== */
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: insets.bottom + 140, paddingHorizontal: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchStats();
              }}
              tintColor={palette.accent}
            />
          }
        >
          <Text style={[styles.noticeText, { color: palette.textMuted }]}>Tap the card for additional information.</Text>

          {/* Section 1: Today */}
          <Text style={[styles.sectionHeader, { color: palette.text }]}>Today – {dateTodayString}</Text>
          <View style={styles.gridRow}>
            <MetricCard
              count={stats?.today.attendance ?? 0}
              label="Attendance"
              icon="calendar-outline"
              palette={palette}
              onPress={() => onOpenRecordAttendance('report')}
            />
            <MetricCard
              count={stats?.today.birthdays ?? 0}
              label="Birthdays"
              icon="gift-outline"
              palette={palette}
              onPress={() => onNavigateMembersWithFilter('birthday_today')}
            />
          </View>
          <View style={[styles.gridRow, { marginTop: 10 }]}>
            <MetricCard
              count={stats?.today.expiresToday ?? 0}
              label="Expires Today"
              icon="alert-circle-outline"
              countColor={palette.statusExpiredText}
              palette={palette}
              onPress={() => onNavigateMembersWithFilter('expiring_today')}
            />
            <MetricCard
              count={stats?.today.ptExpiresToday ?? 0}
              label="PT Plan Expiring To..."
              icon="alert-circle-outline"
              countColor={palette.statusExpiredText}
              palette={palette}
              onPress={() => onNavigateMembersWithFilter('pt_expiring_today')}
            />
          </View>

          {/* Section 2: Attendance (NON-CLICKABLE AS REQUESTED) */}
          <Text style={[styles.sectionHeader, { color: palette.text }]}>Attendance – {monthYearString}</Text>
          <View style={styles.gridRow}>
            <MetricCard
              count={stats?.attendanceMonthly.monthlyCheckIns ?? 0}
              label="Monthly Check-ins"
              icon="calendar-outline"
              showChevron={false}
              palette={palette}
            />
            <MetricCard
              count={stats?.attendanceMonthly.uniqueMembersAttendance ?? 0}
              label="Unique Members Atte..."
              icon="people-outline"
              showChevron={false}
              palette={palette}
            />
          </View>

          {/* Section 3: Membership Expiry */}
          <Text style={[styles.sectionHeader, { color: palette.text }]}>Membership Expiry</Text>
          <View style={styles.gridRow}>
            <MetricCard
              count={stats?.membershipExpiry.expiring1to3 ?? 0}
              label="Expiring (1–3d)"
              icon="time-outline"
              palette={palette}
              onPress={() => onNavigateMembersWithFilter('expiring_1_3')}
            />
            <MetricCard
              count={stats?.membershipExpiry.expiring4to7 ?? 0}
              label="Expiring (4–7d)"
              icon="time-outline"
              palette={palette}
              onPress={() => onNavigateMembersWithFilter('expiring_4_7')}
            />
          </View>
          <View style={[styles.gridRow, { marginTop: 10 }]}>
            <MetricCard
              count={stats?.membershipExpiry.expiring8to15 ?? 0}
              label="Expiring (8–15d)"
              icon="time-outline"
              palette={palette}
              onPress={() => onNavigateMembersWithFilter('expiring_8_15')}
            />
            <View style={{ flex: 1 }} />
          </View>

          {/* Section 4: PT Plan Expiry */}
          <Text style={[styles.sectionHeader, { color: palette.text }]}>PT Plan Expiry</Text>
          <View style={styles.gridRow}>
            <MetricCard
              count={stats?.ptPlanExpiry.ptExpiring1to3 ?? 0}
              label="Expiring (1–3d)"
              icon="time-outline"
              palette={palette}
              onPress={() => onNavigateMembersWithFilter('pt_expiring_1_3')}
            />
            <MetricCard
              count={stats?.ptPlanExpiry.ptExpiring4to7 ?? 0}
              label="Expiring (4–7d)"
              icon="time-outline"
              palette={palette}
              onPress={() => onNavigateMembersWithFilter('pt_expiring_4_7')}
            />
          </View>
          <View style={[styles.gridRow, { marginTop: 10 }]}>
            <MetricCard
              count={stats?.ptPlanExpiry.ptExpiring8to15 ?? 0}
              label="Expiring (8–15d)"
              icon="time-outline"
              palette={palette}
              onPress={() => onNavigateMembersWithFilter('pt_expiring_8_15')}
            />
            <View style={{ flex: 1 }} />
          </View>

          {/* Section 5: Membership Overview */}
          <Text style={[styles.sectionHeader, { color: palette.text }]}>Membership Overview</Text>
          <View style={styles.gridRow}>
            <MetricCard
              count={stats?.membershipOverview.activeMembers ?? 0}
              countColor={palette.statusActiveText}
              label="Active Members"
              icon="checkmark-circle-outline"
              accentColor={palette.statusActiveText}
              palette={palette}
              onPress={() => onNavigateMembersWithFilter('active')}
            />
            <MetricCard
              count={stats?.membershipOverview.expiredMembers ?? 0}
              countColor={palette.statusExpiredText}
              label="Expired Members"
              icon="close-circle-outline"
              accentColor={palette.statusExpiredText}
              palette={palette}
              onPress={() => onNavigateMembersWithFilter('inactive')}
            />
          </View>
          <View style={[styles.gridRow, { marginTop: 10 }]}>
            <MetricCard
              count={stats?.membershipOverview.totalMembers ?? 0}
              countColor={palette.statusActiveText}
              label="Total Members"
              icon="people-outline"
              accentColor={palette.statusActiveText}
              palette={palette}
              onPress={() => onNavigateMembersWithFilter('all')}
            />
            <MetricCard
              count={stats?.membershipOverview.blockMembers ?? 0}
              countColor={palette.statusExpiredText}
              label="Block Members"
              icon="lock-closed-outline"
              accentColor={palette.statusExpiredText}
              palette={palette}
              onPress={() => onNavigateMembersWithFilter('frozen')}
            />
          </View>

          {/* Section 6: PT Plan Overview */}
          <Text style={[styles.sectionHeader, { color: palette.text }]}>PT Plan Overview</Text>
          <View style={styles.gridRow}>
            <MetricCard
              count={stats?.ptPlanOverview.activePTPlans ?? 0}
              countColor={palette.statusActiveText}
              label="Active PT Plans"
              icon="checkmark-circle-outline"
              accentColor={palette.statusActiveText}
              palette={palette}
              onPress={() => onNavigateMembersWithFilter('active_pt')}
            />
            <MetricCard
              count={stats?.ptPlanOverview.expiredPTPlans ?? 0}
              countColor={palette.statusExpiredText}
              label="Expired PT Plans"
              icon="close-circle-outline"
              accentColor={palette.statusExpiredText}
              palette={palette}
              onPress={() => onNavigateMembersWithFilter('expired_pt')}
            />
          </View>
          <View style={[styles.gridRow, { marginTop: 10 }]}>
            <MetricCard
              count={stats?.ptPlanOverview.totalPTPlans ?? 0}
              countColor={palette.accent}
              label="Total PT Plans"
              icon="people-outline"
              palette={palette}
              onPress={() => onNavigateMembersWithFilter('total_pt')}
            />
            <View style={{ flex: 1 }} />
          </View>
        </ScrollView>
      ) : topTab === 'payments' ? (
        /* ==================== PAYMENTS TAB (Screenshots 1 & 2) ==================== */
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100, paddingHorizontal: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchStats();
              }}
              tintColor={palette.accent}
            />
          }
        >
          {/* Section A: Today's Collection */}
          <Text style={[styles.sectionHeader, { color: palette.text, marginTop: 14 }]}>
            Today's Collection – {dateTodayString}
          </Text>

          <Pressable
            style={[styles.financialLargeCard, { backgroundColor: isDark ? '#161922' : '#EBF5FF', borderColor: isDark ? '#262D3D' : '#BEE3F8' }]}
            onPress={() => {
              const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              onNavigateSalesReport?.(todayStart, now);
            }}
          >
            <View style={styles.financialLargeCardHeader}>
              <Text style={[styles.financialLargeAmount, { color: palette.text }]}>
                ₹ {financialStats?.todayCollection?.toLocaleString('en-IN') ?? 0}
              </Text>
              <View style={[styles.financialIconBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#006666' }]}>
                <Ionicons name="cash-outline" size={20} color="#FFFFFF" />
              </View>
            </View>
            <View style={styles.financialLargeCardFooter}>
              <Text style={[styles.financialLargeLabel, { color: palette.textMuted }]}>Membership Collected Today</Text>
              <Ionicons name="chevron-forward" size={16} color={palette.textFaint} />
            </View>
          </Pressable>

          {/* Section B: Month Section & Filters */}
          <Text style={[styles.sectionHeader, { color: palette.text, marginTop: 22 }]}>
            {getActiveMonthRange().periodLabel}
          </Text>

          {/* Filter Row Pills */}
          <View style={[styles.filterPillRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F1F5F9' }]}>
            <Pressable
              style={[styles.filterPillBtn, monthFilter === 'this_month' && { backgroundColor: isDark ? palette.accent : '#006666' }]}
              onPress={() => setMonthFilter('this_month')}
            >
              <Text style={[styles.filterPillText, { color: monthFilter === 'this_month' ? '#FFFFFF' : palette.textMuted }]}>
                This Month
              </Text>
            </Pressable>
            <Pressable
              style={[styles.filterPillBtn, monthFilter === 'last_month' && { backgroundColor: isDark ? palette.accent : '#006666' }]}
              onPress={() => setMonthFilter('last_month')}
            >
              <Text style={[styles.filterPillText, { color: monthFilter === 'last_month' ? '#FFFFFF' : palette.textMuted }]}>
                Last Month
              </Text>
            </Pressable>
            <Pressable
              style={[styles.filterPillBtn, monthFilter === 'last_3_months' && { backgroundColor: isDark ? palette.accent : '#006666' }]}
              onPress={() => setMonthFilter('last_3_months')}
            >
              <Text style={[styles.filterPillText, { color: monthFilter === 'last_3_months' ? '#FFFFFF' : palette.textMuted }]}>
                Last 3 Mon...
              </Text>
            </Pressable>
            <Pressable
              style={[styles.filterPillBtn, monthFilter === 'custom' && { backgroundColor: isDark ? palette.accent : '#006666' }]}
              onPress={() => setShowMonthPicker(true)}
            >
              <Text style={[styles.filterPillText, { color: monthFilter === 'custom' ? '#FFFFFF' : palette.textMuted }]}>
                Custom
              </Text>
            </Pressable>
          </View>

          {/* Month Financial Cards Grid */}
          <View style={[styles.gridRow, { marginTop: 14 }]}>
            <FinancialMetricCard
              amount={currentMonthData?.admissionFees ?? 0}
              label="Admission Fees"
              icon="cash-outline"
              palette={palette}
              onPress={() => {
                const { from, to, periodLabel } = getActiveMonthRange();
                onNavigateAdmissionReport?.(from, to, periodLabel);
              }}
            />
            <FinancialMetricCard
              amount={currentMonthData?.membershipCollected ?? 0}
              label="Membership Collec..."
              icon="cash-outline"
              amountColor={isDark ? '#2ED573' : '#006666'}
              palette={palette}
              onPress={() => {
                const { from, to } = getActiveMonthRange();
                onNavigateSalesReport?.(from, to);
              }}
            />
          </View>
          <View style={[styles.gridRow, { marginTop: 10 }]}>
            <FinancialMetricCard
              amount={currentMonthData?.membershipDue ?? 0}
              label="Membership Due"
              icon="wallet-outline"
              amountColor={palette.accent}
              palette={palette}
              onPress={() => {
                const { from, to, periodLabel } = getActiveMonthRange();
                onNavigatePendingPlanPayments?.(false, from, to, periodLabel);
              }}
            />
            <FinancialMetricCard
              amount={currentMonthData?.ptDue ?? 0}
              label="PT Due"
              icon="wallet-outline"
              amountColor={palette.accent}
              palette={palette}
              onPress={() => {
                const { from, to, periodLabel } = getActiveMonthRange();
                onNavigatePendingPlanPayments?.(true, from, to, periodLabel);
              }}
            />
          </View>
          <View style={[styles.gridRow, { marginTop: 10 }]}>
            <FinancialMetricCard
              amount={currentMonthData?.servicePaid ?? 0}
              label="Service Paid"
              icon="cash-outline"
              palette={palette}
              onPress={() => {
                const { from, to, periodLabel } = getActiveMonthRange();
                onNavigateServiceReport?.('paid', from, to, periodLabel);
              }}
            />
            <FinancialMetricCard
              amount={currentMonthData?.serviceDue ?? 0}
              label="Service Due"
              icon="wallet-outline"
              palette={palette}
              onPress={() => {
                const { from, to, periodLabel } = getActiveMonthRange();
                onNavigateServiceReport?.('due', from, to, periodLabel);
              }}
            />
          </View>
          <View style={[styles.gridRow, { marginTop: 10 }]}>
            <FinancialMetricCard
              amount={currentMonthData?.expense ?? 0}
              label="Expense"
              icon="cash-outline"
              amountColor={palette.statusExpiredText}
              palette={palette}
              onPress={() => {
                const { from, to } = getActiveMonthRange();
                onNavigateManageExpense?.(from, to);
              }}
            />
            <View style={{ flex: 1 }} />
          </View>

          {/* Section C: Financial Summary (Scroll Down - Screenshot 2) */}
          <Text style={[styles.sectionHeader, { color: palette.text, marginTop: 26 }]}>
            Financial Summary — {now.getFullYear()}-01 to {now.getFullYear()}-{String(now.getMonth() + 1).padStart(2, '0')}
          </Text>

          {/* Year Filter Row Pills */}
          <View style={[styles.filterPillRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F1F5F9' }]}>
            <Pressable
              style={[styles.filterPillBtn, yearFilter === 'this_year' && { backgroundColor: isDark ? palette.accent : '#006666' }]}
              onPress={() => setYearFilter('this_year')}
            >
              <Text style={[styles.filterPillText, { color: yearFilter === 'this_year' ? '#FFFFFF' : palette.textMuted }]}>
                This Year
              </Text>
            </Pressable>
            <Pressable
              style={[styles.filterPillBtn, yearFilter === 'last_year' && { backgroundColor: isDark ? palette.accent : '#006666' }]}
              onPress={() => setYearFilter('last_year')}
            >
              <Text style={[styles.filterPillText, { color: yearFilter === 'last_year' ? '#FFFFFF' : palette.textMuted }]}>
                Last Year
              </Text>
            </Pressable>
            <Pressable
              style={[styles.filterPillBtn, yearFilter === 'lifetime' && { backgroundColor: isDark ? palette.accent : '#006666' }]}
              onPress={() => setYearFilter('lifetime')}
            >
              <Text style={[styles.filterPillText, { color: yearFilter === 'lifetime' ? '#FFFFFF' : palette.textMuted }]}>
                Lifetime
              </Text>
            </Pressable>
            <Pressable
              style={[styles.filterPillBtn, yearFilter === 'custom' && { backgroundColor: isDark ? palette.accent : '#006666' }]}
              onPress={() => setShowMonthPicker(true)}
            >
              <Text style={[styles.filterPillText, { color: yearFilter === 'custom' ? '#FFFFFF' : palette.textMuted }]}>
                Custom
              </Text>
            </Pressable>
          </View>

          {/* Summary Financial Cards Grid */}
          <View style={[styles.gridRow, { marginTop: 14 }]}>
            <FinancialMetricCard
              amount={currentYearData?.admissionFees ?? 0}
              label="Admission Fees"
              icon="cash-outline"
              palette={palette}
              onPress={() => {
                const { from, to, periodLabel } = getActiveYearRange();
                onNavigateAdmissionReport?.(from, to, periodLabel);
              }}
            />
            <FinancialMetricCard
              amount={currentYearData?.membershipCollected ?? 0}
              label="Membership Collec..."
              icon="cash-outline"
              amountColor={isDark ? '#2ED573' : '#006666'}
              palette={palette}
              onPress={() => {
                const { from, to } = getActiveYearRange();
                onNavigateSalesReport?.(from, to);
              }}
            />
          </View>
          <View style={[styles.gridRow, { marginTop: 10 }]}>
            <FinancialMetricCard
              amount={currentYearData?.membershipDue ?? 0}
              label="Membership Due"
              icon="alert-circle-outline"
              amountColor={palette.accent}
              palette={palette}
              onPress={() => {
                const { from, to, periodLabel } = getActiveYearRange();
                onNavigatePendingPlanPayments?.(false, from, to, periodLabel);
              }}
            />
            <FinancialMetricCard
              amount={currentYearData?.ptDue ?? 0}
              label="PT Due"
              icon="wallet-outline"
              amountColor={palette.accent}
              palette={palette}
              onPress={() => {
                const { from, to, periodLabel } = getActiveYearRange();
                onNavigatePendingPlanPayments?.(true, from, to, periodLabel);
              }}
            />
          </View>
          <View style={[styles.gridRow, { marginTop: 10 }]}>
            <FinancialMetricCard
              amount={currentYearData?.servicePaid ?? 0}
              label="Service Paid"
              icon="cash-outline"
              palette={palette}
              onPress={() => {
                const { from, to, periodLabel } = getActiveYearRange();
                onNavigateServiceReport?.('paid', from, to, periodLabel);
              }}
            />
            <FinancialMetricCard
              amount={currentYearData?.serviceDue ?? 0}
              label="Service Due"
              icon="wallet-outline"
              palette={palette}
              onPress={() => {
                const { from, to, periodLabel } = getActiveYearRange();
                onNavigateServiceReport?.('due', from, to, periodLabel);
              }}
            />
          </View>
          <View style={[styles.gridRow, { marginTop: 10 }]}>
            <FinancialMetricCard
              amount={currentYearData?.expense ?? 0}
              label="Expense"
              icon="cash-outline"
              amountColor={palette.statusExpiredText}
              palette={palette}
              onPress={() => {
                const { from, to } = getActiveYearRange();
                onNavigateManageExpense?.(from, to);
              }}
            />
            <View style={{ flex: 1 }} />
          </View>
        </ScrollView>
      ) : (
        /* ==================== ATTENDANCE TAB (Full Calendar Grid) ==================== */
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchAttendanceForSelectedDate(selectedAttDate, calendarMonthDate);
                setRefreshing(false);
              }}
              tintColor={palette.accent}
            />
          }
        >
          {/* Calendar Month Navigation Header */}
          <View style={styles.calendarMonthHeader}>
            <Pressable
              onPress={() => {
                const prev = new Date(calendarMonthDate.getFullYear(), calendarMonthDate.getMonth() - 1, 1);
                setCalendarMonthDate(prev);
                fetchAttendanceForSelectedDate(selectedAttDate, prev);
              }}
              hitSlop={12}
            >
              <Ionicons name="caret-back" size={18} color={isDark ? palette.accent : '#006666'} />
            </Pressable>

            <Text style={[styles.calendarMonthTitle, { color: isDark ? palette.text : '#006666' }]}>
              {MONTH_NAMES[calendarMonthDate.getMonth()]} {calendarMonthDate.getFullYear()}
            </Text>

            <Pressable
              onPress={() => {
                const next = new Date(calendarMonthDate.getFullYear(), calendarMonthDate.getMonth() + 1, 1);
                setCalendarMonthDate(next);
                fetchAttendanceForSelectedDate(selectedAttDate, next);
              }}
              hitSlop={12}
            >
              <Ionicons name="caret-forward" size={18} color={isDark ? palette.accent : '#006666'} />
            </Pressable>
          </View>

          {/* Day Names Row (7 equal columns) */}
          <View style={styles.weekdayRow}>
            {WEEKDAY_NAMES.map((w) => (
              <Text key={w} style={[styles.weekdayText, { color: palette.textFaint }]}>
                {w}
              </Text>
            ))}
          </View>

          {/* 7-Column Full Month Calendar Grid Matrix */}
          <View style={styles.calendarGrid}>
            {gridCells.map((cell, idx) => {
              const isSelected = formatDateStr(selectedAttDate) === cell.dateStr;
              const count = attCounts[cell.dateStr] || 0;

              return (
                <Pressable
                  key={cell.dateStr + '_' + idx}
                  style={styles.gridCell}
                  onPress={() => {
                    setSelectedAttDate(cell.date);
                    if (!cell.isCurrentMonth) {
                      const newMonth = new Date(cell.date.getFullYear(), cell.date.getMonth(), 1);
                      setCalendarMonthDate(newMonth);
                      fetchAttendanceForSelectedDate(cell.date, newMonth);
                    } else {
                      fetchAttendanceForSelectedDate(cell.date, calendarMonthDate);
                    }
                  }}
                >
                  <View
                    style={[
                      styles.cellContainer,
                      isSelected && {
                        backgroundColor: isDark ? palette.accent : '#006666',
                        borderRadius: 12,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.cellDateText,
                        { color: cell.isCurrentMonth ? palette.text : palette.textFaint },
                        isSelected && { color: '#FFFFFF', fontWeight: '900' },
                      ]}
                    >
                      {cell.dateNum}
                    </Text>

                    {/* Attendance Count Badge under Date */}
                    {count > 0 ? (
                      <View
                        style={[
                          styles.cellBadge,
                          isSelected
                            ? { backgroundColor: '#FFFFFF' }
                            : { backgroundColor: isDark ? 'rgba(46,213,115,0.2)' : '#D1ECF1' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.cellBadgeText,
                            isSelected
                              ? { color: isDark ? palette.accent : '#006666' }
                              : { color: isDark ? '#2ED573' : '#006666' },
                          ]}
                        >
                          {count}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.cellBadgePlaceholder} />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Selected Date Header & Total Badge */}
          <View style={styles.attHeaderRow}>
            <Text style={[styles.attSelectedDateText, { color: palette.text }]}>
              {formatDateDisplay(selectedAttDate)}
            </Text>
            <View style={[styles.totalBadge, { backgroundColor: isDark ? 'rgba(46,213,115,0.15)' : '#E6F4F1' }]}>
              <Text style={[styles.totalBadgeText, { color: isDark ? '#2ED573' : '#006666' }]}>
                Total: {attCountsSummary.total}
              </Text>
            </View>
          </View>

          {/* + Add Back-dated Entry Button */}
          <Pressable
            style={[styles.addBackDatedBtn, { borderColor: isDark ? palette.accent : '#006666' }]}
            onPress={() => {
              setBackDate(selectedAttDate);
              setBackTime(new Date());
              setShowAddBackDated(true);
            }}
          >
            <Ionicons name="add" size={20} color={isDark ? palette.accent : '#006666'} />
            <Text style={[styles.addBackDatedBtnText, { color: isDark ? palette.accent : '#006666' }]}>
              Add Back-dated Entry
            </Text>
          </Pressable>

          {/* Summary Box & Radio Filters */}
          <View style={[styles.summaryBox, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
            <Text style={[styles.summaryTitle, { color: palette.text }]}>
              Total: {attCountsSummary.total} | Active: {attCountsSummary.active} | Expired: {attCountsSummary.expired}
            </Text>
            <View style={[styles.summaryDivider, { backgroundColor: palette.cardBorder }]} />
            <View style={styles.radioRow}>
              <Pressable style={styles.radioBtn} onPress={() => setAttFilter('all')}>
                <Ionicons
                  name={attFilter === 'all' ? 'radio-button-on' : 'radio-button-off-outline'}
                  size={18}
                  color={isDark ? palette.accent : '#006666'}
                />
                <Text style={[styles.radioLabel, { color: palette.text }]}>All ({attCountsSummary.total})</Text>
              </Pressable>

              <Pressable style={styles.radioBtn} onPress={() => setAttFilter('active')}>
                <Ionicons
                  name={attFilter === 'active' ? 'radio-button-on' : 'radio-button-off-outline'}
                  size={18}
                  color={palette.statusActiveText}
                />
                <Text style={[styles.radioLabel, { color: palette.statusActiveText }]}>
                  Active ({attCountsSummary.active})
                </Text>
              </Pressable>

              <Pressable style={styles.radioBtn} onPress={() => setAttFilter('expired')}>
                <Ionicons
                  name={attFilter === 'expired' ? 'radio-button-on' : 'radio-button-off-outline'}
                  size={18}
                  color={palette.statusExpiredText}
                />
                <Text style={[styles.radioLabel, { color: palette.statusExpiredText }]}>
                  Expired ({attCountsSummary.expired})
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Attendance Records List */}
          {attLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={palette.accent} />
            </View>
          ) : filteredAttRecords.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: palette.textMuted }]}>
                No attendance record for this date
              </Text>
            </View>
          ) : (
            <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
              {filteredAttRecords.map((item) => {
                const m = item.memberId;
                const isExpired = m ? new Date(m.planExpiryDate).getTime() < Date.now() : false;

                return (
                  <Pressable
                    key={item._id}
                    style={[styles.attMemberCard, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}
                    onPress={() => {
                      if (onOpenMemberDetail && m?._id) {
                        getMember(m._id).then(onOpenMemberDetail).catch(console.error);
                      } else {
                        handleOpenMemberHistory(m);
                      }
                    }}
                  >
                    <View style={styles.attMemberCardTop}>
                      <Ionicons name="person" size={18} color={isDark ? palette.accent : '#006666'} style={{ marginRight: 8 }} />
                      <Text style={[styles.attMemberName, { color: palette.text }]}>{m?.name || 'Unknown Member'}</Text>
                      <Text style={[styles.attMemberMid, { color: palette.textMuted }]}>
                        M ID - {m?.membershipId || '1'}
                      </Text>
                      <View style={[styles.attStatusTag, { backgroundColor: isExpired ? palette.statusExpiredBg : palette.statusActiveBg }]}>
                        <Text style={[styles.attStatusText, { color: isExpired ? palette.statusExpiredText : palette.statusActiveText }]}>
                          {isExpired ? 'Expired' : 'Active'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.attTimeRow}>
                      <View style={styles.attTimeBlock}>
                        <Ionicons name="arrow-forward-circle" size={18} color={palette.statusActiveText} />
                        <Text style={[styles.attTimeText, { color: palette.text }]}>
                          {formatTime12h(item.punchInTime)}
                        </Text>
                      </View>
                      <View style={styles.attTimeBlock}>
                        <Ionicons name="arrow-back-circle" size={18} color="#FF9F43" />
                        <Text style={[styles.attTimeText, { color: palette.text }]}>
                          {item.punchOutTime ? formatTime12h(item.punchOutTime) : 'N/A'}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* Sticky Floating Record Attendance Button (for Membership Tab) */}
      {topTab === 'membership' && (
        <Pressable
          style={[styles.floatingAttendanceBtnWrapper, { bottom: insets.bottom + 74 }]}
          onPress={() => onOpenRecordAttendance('attendance')}
        >
          <LinearGradient
            colors={palette.gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.floatingAttendanceBtn}
          >
            <Ionicons name="checkbox-outline" size={22} color="#FFFFFF" />
            <Text style={styles.floatingBtnText}>Record Attendance</Text>
          </LinearGradient>
        </Pressable>
      )}

      {/* Bottom Navigation Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: palette.tabBarBg, borderTopColor: palette.tabBarBorder, paddingBottom: insets.bottom || 10 }]}>
        <TabItem icon="people-outline" label="Members" onPress={() => onNavigateTab('members')} palette={palette} />
        <TabItem icon="pie-chart" label="Dashboard" active palette={palette} />
        <TabItem icon="document-text-outline" label="Reports" onPress={() => onNavigateTab('reports')} palette={palette} />
        <TabItem icon="business-outline" label="Gym" onPress={() => onNavigateTab('gym')} palette={palette} />
      </View>

      {/* ==================== ADD BACK-DATED ENTRY MODAL (Screenshot 4) ==================== */}
      <Modal visible={showAddBackDated} transparent animationType="slide" onRequestClose={() => setShowAddBackDated(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowAddBackDated(false)} />
          <View style={[styles.modalContent, { backgroundColor: palette.sheetBg, paddingBottom: insets.bottom + 20 }]}>
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: isDark ? palette.text : '#006666' }]}>
                Add Back-dated Entry
              </Text>
              <Pressable style={styles.modalClearBtn} onPress={() => setShowAddBackDated(false)}>
                <Ionicons name="close" size={18} color={palette.textMuted} />
                <Text style={[styles.modalClearText, { color: palette.textMuted }]}>Clear</Text>
              </Pressable>
            </View>

            {/* Date Picker Input */}
            <Text style={[styles.inputFieldLabel, { color: palette.textMuted }]}>Date</Text>
            <Pressable
              style={[styles.modalInputWrap, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder }]}
              onPress={() => setPickerMode('date')}
            >
              <Ionicons name="calendar-outline" size={18} color={isDark ? palette.accent : '#006666'} style={{ marginRight: 10 }} />
              <Text style={[styles.modalInputText, { color: palette.text }]}>{formatDateDisplay(backDate)}</Text>
            </Pressable>

            {/* Time Picker Input */}
            <Text style={[styles.inputFieldLabel, { color: palette.textMuted }]}>In Time</Text>
            <Pressable
              style={[styles.modalInputWrap, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder }]}
              onPress={() => setPickerMode('time')}
            >
              <Ionicons name="time-outline" size={18} color={isDark ? palette.accent : '#006666'} style={{ marginRight: 10 }} />
              <Text style={[styles.modalInputText, { color: palette.text }]}>{formatTime12h(backTime)}</Text>
            </Pressable>

            {/* Native Date / Time Picker Popup */}
            {pickerMode && DateTimePicker && (
              <DateTimePicker
                value={pickerMode === 'date' ? backDate : backTime}
                mode={pickerMode}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_event: any, selected?: Date) => {
                  setPickerMode(null);
                  if (selected) {
                    if (pickerMode === 'date') setBackDate(selected);
                    else setBackTime(selected);
                  }
                }}
              />
            )}

            {/* Search Input */}
            <View style={[styles.modalSearchWrap, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder }]}>
              <Ionicons name="search-outline" size={18} color={palette.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.modalSearchInput, { color: palette.text }]}
                placeholder="Search by member name..."
                placeholderTextColor={palette.textFaint}
                value={memberSearch}
                onChangeText={setMemberSearch}
              />
            </View>

            {/* Member List with Plus Icon */}
            <ScrollView style={{ maxHeight: 260, marginTop: 10 }}>
              {filteredSearchMembers.map((m) => (
                <View key={m._id} style={[styles.modalMemberItem, { borderBottomColor: palette.surfaceBorder }]}>
                  <View style={[styles.modalAvatar, { backgroundColor: isDark ? palette.accentDeep : '#006666' }]}>
                    <Text style={styles.modalAvatarText}>{getInitials(m.name)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalMemberName, { color: palette.text }]}>{m.name}</Text>
                    <Text style={[styles.modalMemberMid, { color: palette.textMuted }]}>M ID {m.membershipId}</Text>
                    <Text style={[styles.modalMemberPhone, { color: palette.textFaint }]}>+91 {m.mobile}</Text>
                  </View>
                  <Pressable
                    style={[styles.modalPlusBtn, { backgroundColor: isDark ? palette.accent : '#006666' }]}
                    onPress={() => handleAddBackDated(m)}
                    disabled={addingMemberId === m._id}
                  >
                    {addingMemberId === m._id ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="add" size={20} color="#FFFFFF" />
                    )}
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ==================== MEMBER ATTENDANCE HISTORY MODAL (Screenshot 5) ==================== */}
      <Modal visible={!!historyMember} transparent animationType="slide" onRequestClose={() => setHistoryMember(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.historyContainer, { backgroundColor: palette.background, paddingTop: insets.top }]}>
            {/* Header */}
            <View style={[styles.historyTopBar, { backgroundColor: palette.topBarBg }]}>
              <Pressable onPress={() => setHistoryMember(null)} style={styles.historyBackBtn}>
                <Ionicons name="chevron-back" size={22} color={palette.topBarText} />
                <Text style={[styles.historyBackText, { color: palette.topBarText }]}>Back</Text>
              </Pressable>
              <Text style={[styles.historyTitle, { color: palette.topBarText }]}>
                {historyMember?.name}
              </Text>
            </View>

            {/* List of past attendance entries */}
            {historyLoading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={palette.accent} />
              </View>
            ) : historyRecords.length === 0 ? (
              <View style={styles.center}>
                <Text style={[styles.emptyText, { color: palette.textMuted }]}>No past attendance history found.</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30 }}>
                {historyRecords.map((rec) => (
                  <View key={rec._id} style={[styles.historyCard, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
                    <View style={styles.historyDateRow}>
                      <Ionicons name="calendar-outline" size={18} color={isDark ? palette.accent : '#006666'} style={{ marginRight: 8 }} />
                      <Text style={[styles.historyDateText, { color: palette.text }]}>
                        {formatDateDisplay(new Date(rec.punchInTime || rec.createdAt))}
                      </Text>
                    </View>

                    <View style={styles.historyTimeRow}>
                      <View style={styles.historyTimeBlock}>
                        <Ionicons name="arrow-forward-circle" size={18} color={palette.statusActiveText} />
                        <Text style={[styles.historyTimeText, { color: palette.text }]}>
                          {formatTime12h(rec.punchInTime)}
                        </Text>
                      </View>
                      <View style={styles.historyTimeBlock}>
                        <Ionicons name="arrow-back-circle" size={18} color="#FF9F43" />
                        <Text style={[styles.historyTimeText, { color: palette.text }]}>
                          {rec.punchOutTime ? formatTime12h(rec.punchOutTime) : 'N/A'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Custom Month Picker Modal (Screenshot 1) */}
      <MonthPickerModal
        visible={showMonthPicker}
        selectedYear={selectedCustomYear}
        selectedMonth={selectedCustomMonth}
        onApply={(y, m) => {
          setSelectedCustomYear(y);
          setSelectedCustomMonth(m);
          setMonthFilter('custom');
          loadCustomFinancialStats(y, m);
        }}
        onClose={() => setShowMonthPicker(false)}
      />

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

function MetricCard({
  count,
  countColor,
  label,
  icon,
  accentColor,
  showChevron = true,
  palette,
  onPress,
}: {
  count: number;
  countColor?: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor?: string;
  showChevron?: boolean;
  palette: any;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.cardCount, { color: countColor || palette.accent }]}>{count}</Text>
        <Ionicons name={icon} size={22} color={accentColor || palette.accent} />
      </View>
      <View style={styles.cardFooter}>
        <Text style={[styles.cardLabel, { color: palette.textMuted }]} numberOfLines={1}>
          {label}
        </Text>
        {showChevron && !!onPress && <Ionicons name="chevron-forward" size={14} color={palette.textFaint} />}
      </View>
    </Pressable>
  );
}

function FinancialMetricCard({
  amount,
  amountColor,
  label,
  icon,
  palette,
  onPress,
}: {
  amount: number;
  amountColor?: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  palette: any;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}
      onPress={onPress}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.cardCount, { color: amountColor || (palette.isDark ? '#2ED573' : '#006666') }]}>
          ₹ {amount.toLocaleString('en-IN')}
        </Text>
        <Ionicons name={icon} size={20} color={palette.isDark ? '#2ED573' : '#006666'} />
      </View>
      <View style={styles.cardFooter}>
        <Text style={[styles.cardLabel, { color: palette.textMuted }]} numberOfLines={1}>
          {label}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={palette.textFaint} />
      </View>
    </Pressable>
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
      <Text style={[styles.tabLabel, { color: palette.textMuted }, active && { color: palette.accent, fontWeight: '700' }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

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

  topTabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  topTabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  topTabText: {
    fontSize: 14,
    fontWeight: '600',
  },

  noticeText: {
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 12,
    fontWeight: '500',
  },

  scroll: { flex: 1 },

  sectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 10,
  },

  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardCount: {
    fontSize: 20,
    fontWeight: '900',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    flex: 1,
    marginRight: 4,
  },

  /* Financial Large Card */
  financialLargeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  financialLargeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  financialLargeAmount: {
    fontSize: 26,
    fontWeight: '900',
  },
  financialIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  financialLargeCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  financialLargeLabel: {
    fontSize: 13,
    fontWeight: '600',
  },

  filterPillRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginTop: 6,
    gap: 4,
  },
  filterPillBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
  },

  /* Attendance Calendar Grid Styles */
  calendarMonthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  calendarMonthTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  gridCell: {
    width: '14.285%',
    alignItems: 'center',
    paddingVertical: 4,
  },
  cellContainer: {
    width: 38,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  cellDateText: {
    fontSize: 14,
    fontWeight: '700',
  },
  cellBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellBadgeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  cellBadgePlaceholder: {
    height: 18,
  },

  attHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 16,
  },
  attSelectedDateText: {
    fontSize: 18,
    fontWeight: '900',
  },
  totalBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  totalBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },

  addBackDatedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 14,
    height: 48,
  },
  addBackDatedBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },

  summaryBox: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  summaryTitle: { fontSize: 13, fontWeight: '800', textAlign: 'center' },
  summaryDivider: { height: 1, marginVertical: 10 },
  radioRow: { flexDirection: 'row', justifyContent: 'space-around' },
  radioBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  radioLabel: { fontSize: 12.5, fontWeight: '600' },

  attMemberCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  attMemberCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attMemberName: {
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  attMemberMid: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 8,
  },
  attStatusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  attStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  attTimeRow: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 12,
  },
  attTimeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attTimeText: {
    fontSize: 13,
    fontWeight: '700',
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
  },

  /* Modals */
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modalClearText: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  modalInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  modalInputText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    marginTop: 14,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
  },
  modalMemberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  modalAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAvatarText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  modalMemberName: {
    fontSize: 14,
    fontWeight: '800',
  },
  modalMemberMid: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalMemberPhone: {
    fontSize: 11,
  },
  modalPlusBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Member History Modal */
  historyContainer: {
    flex: 1,
  },
  historyTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  historyBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyBackText: {
    fontSize: 16,
    fontWeight: '700',
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  historyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  historyDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyDateText: {
    fontSize: 15,
    fontWeight: '800',
  },
  historyTimeRow: {
    flexDirection: 'row',
    gap: 24,
  },
  historyTimeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyTimeText: {
    fontSize: 13,
    fontWeight: '700',
  },

  floatingAttendanceBtnWrapper: {
    position: 'absolute',
    right: 18,
    zIndex: 20,
    borderRadius: 24,
    elevation: 8,
  },
  floatingAttendanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 24,
  },
  floatingBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 10,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 3 },
  tabLabel: { fontSize: 11, fontWeight: '600' },
});

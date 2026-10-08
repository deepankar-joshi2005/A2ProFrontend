import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatDate } from '../utils/date';
import { getPlanStatus } from '../utils/planStatus';
import { listMembers, getMember, Member } from '../services/member.service';
import {
  getTodayAttendance,
  getAttendanceReport,
  punchAttendance,
  AttendanceRecord,
} from '../services/attendance.service';
import { useTheme } from '../context/ThemeContext';
import { usePermissions } from '../context/PermissionsContext';
import AccessDenied from '../components/AccessDenied';

interface Props {
  onBack: () => void;
  initialTab?: 'attendance' | 'report';
  headerTitle?: string;
  onOpenMemberDetail?: (member: Member) => void;
}

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
};

const formatTime12h = (dateStr: string | null) => {
  if (!dateStr) return '--:--';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

function formatDateNav(date: Date): string {
  const day = date.getDate();
  const month = date.toLocaleString('default', { month: 'short' });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

function formatDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function RecordAttendanceScreen({ onBack, initialTab = 'attendance', headerTitle, onOpenMemberDetail }: Props) {
  const insets = useSafeAreaInsets();
  const { isDark, palette, toggleTheme } = useTheme();
  const { role, can } = usePermissions();
  const isStaff = role === 'staff';
  const canMark = !isStaff || can('attendance.mark');
  const canViewReport = !isStaff || can('reports.attendance');

  const [topTab, setTopTab] = useState<'attendance' | 'report'>(initialTab);
  const [userRole, setUserRole] = useState<'staff' | 'members'>('members');

  useEffect(() => {
    if (initialTab) {
      setTopTab(initialTab);
    }
  }, [initialTab]);

  const [members, setMembers] = useState<Member[]>([]);
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [punchingId, setPunchingId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');

  // Report state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [reportRecords, setReportRecords] = useState<AttendanceRecord[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportFilter, setReportFilter] = useState<'all' | 'active' | 'expired'>('all');

  const loadData = async () => {
    if (!canMark) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [mList, tRecords] = await Promise.all([listMembers(), getTodayAttendance()]);
      setMembers(mList);
      setTodayRecords(tRecords);
    } catch (err) {
      Alert.alert('Error', 'Could not load data');
    } finally {
      setLoading(false);
    }
  };

  const loadReport = async (date: Date) => {
    setReportLoading(true);
    try {
      const dateStr = formatDateStr(date);
      const res = await getAttendanceReport(dateStr);
      setReportRecords(res.records || []);
    } catch (err) {
      console.error(err);
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (topTab === 'report' && canViewReport) {
      loadReport(selectedDate);
    } else if (topTab === 'report') {
      setReportLoading(false);
    }
  }, [topTab, selectedDate]);

  const handlePunch = async (member: Member) => {
    setPunchingId(member._id);
    try {
      const res = await punchAttendance(member._id);
      Alert.alert('Success', res.message);
      const updatedToday = await getTodayAttendance();
      setTodayRecords(updatedToday);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not record attendance');
    } finally {
      setPunchingId(null);
    }
  };

  // Filtered members for Attendance tab
  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.mobile.includes(q) ||
        m.membershipId.toLowerCase().includes(q)
    );
  }, [members, searchQuery]);

  // Report filtered records
  const filteredReportRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const nowMs = Date.now();

    let list = reportRecords.filter((rec) => {
      const m = rec.memberId;
      if (!m) return false;
      if (!q) return true;
      return (
        m.name?.toLowerCase().includes(q) ||
        m.membershipId?.toLowerCase().includes(q) ||
        m.mobile?.includes(q)
      );
    });

    if (reportFilter !== 'all') {
      list = list.filter((rec) => {
        const m = rec.memberId;
        if (!m) return false;
        const expiryMs = new Date(m.planExpiryDate).getTime();
        const isExpired = expiryMs < nowMs;
        return reportFilter === 'expired' ? isExpired : !isExpired;
      });
    }

    return list;
  }, [reportRecords, searchQuery, reportFilter]);

  const reportCounts = useMemo(() => {
    const nowMs = Date.now();
    let total = reportRecords.length;
    let active = 0;
    let expired = 0;
    reportRecords.forEach((rec) => {
      const m = rec.memberId;
      if (m) {
        const isExp = new Date(m.planExpiryDate).getTime() < nowMs;
        if (isExp) expired++;
        else active++;
      }
    });
    return { total, active, expired };
  }, [reportRecords]);

  const prevDay = new Date(selectedDate);
  prevDay.setDate(prevDay.getDate() - 1);

  const nextDay = new Date(selectedDate);
  nextDay.setDate(nextDay.getDate() + 1);

  return (
    <View style={[styles.root, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {/* Top Header */}
      <View style={[styles.topBar, { backgroundColor: palette.topBarBg }]}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={palette.topBarText} />
        </Pressable>
        <Text style={[styles.topTitle, { color: palette.topBarText }]}>
          {headerTitle || (topTab === 'report' ? 'Attendance' : 'Record Attendance')}
        </Text>
        {/* Theme Switcher Toggle Button */}
        <Pressable onPress={toggleTheme} hitSlop={8}>
          <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={22} color={palette.topBarText} />
        </Pressable>
      </View>

      {/* Top Tabs (Attendance | Report) - identical for staff and admin */}
        <View style={[styles.topTabRow, { backgroundColor: isDark ? '#0F1015' : '#FFFFFF', borderBottomColor: palette.surfaceBorder }]}>
          <Pressable
            style={[styles.topTabBtn, topTab === 'attendance' && { borderBottomColor: palette.accent }]}
            onPress={() => setTopTab('attendance')}
          >
            <Text
              style={[
                styles.topTabText,
                { color: palette.textMuted },
                topTab === 'attendance' && { color: palette.text, fontWeight: '700' },
              ]}
            >
              Attendance
            </Text>
          </Pressable>
          <Pressable
            style={[styles.topTabBtn, topTab === 'report' && { borderBottomColor: palette.accent }]}
            onPress={() => setTopTab('report')}
          >
            <Text
              style={[
                styles.topTabText,
                { color: palette.textMuted },
                topTab === 'report' && { color: palette.text, fontWeight: '700' },
              ]}
            >
              Report
            </Text>
          </Pressable>
        </View>

      {/* Staff vs Members Pill Toggle */}
      <View style={[styles.toggleRow, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder }]}>
        <Pressable
          style={[styles.toggleBtn, userRole === 'staff' && { backgroundColor: isDark ? 'rgba(255, 23, 57, 0.18)' : '#EDE9FE' }]}
          onPress={() => setUserRole('staff')}
        >
          <Text style={[styles.toggleText, { color: palette.textMuted }, userRole === 'staff' && { color: isDark ? palette.text : '#4C1D95', fontWeight: '700' }]}>
            Staff
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, userRole === 'members' && { backgroundColor: isDark ? 'rgba(255, 23, 57, 0.18)' : '#EDE9FE' }]}
          onPress={() => setUserRole('members')}
        >
          <Text style={[styles.toggleText, { color: palette.textMuted }, userRole === 'members' && { color: isDark ? palette.text : '#4C1D95', fontWeight: '700' }]}>
            Members
          </Text>
        </Pressable>
      </View>

      {/* REPORT TAB: Date Navigator */}
      {topTab === 'report' && canViewReport && (
        <View style={styles.dateNavRow}>
          <Pressable onPress={() => setSelectedDate(prevDay)} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={palette.accent} />
          </Pressable>
          <Text style={[styles.dateNavSide, { color: palette.textMuted }]}>{formatDateNav(prevDay)}</Text>
          <Text style={[styles.dateNavCenter, { color: palette.text }]}>{formatDateNav(selectedDate)}</Text>
          <Text style={[styles.dateNavSide, { color: palette.textMuted }]}>{formatDateNav(nextDay)}</Text>
          <Pressable onPress={() => setSelectedDate(nextDay)} hitSlop={8}>
            <Ionicons name="chevron-forward" size={20} color={palette.accent} />
          </Pressable>
        </View>
      )}

      {/* Search Input */}
      {((topTab === 'attendance' && canMark) || (topTab === 'report' && canViewReport)) && (
        <View style={[styles.searchRow, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder }]}>
          <Ionicons name="search-outline" size={18} color={palette.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: palette.text }]}
            placeholder={userRole === 'members' ? 'Search by member name...' : 'Search by staff name...'}
            placeholderTextColor={palette.textFaint}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      )}

      {/* REPORT TAB: Summary Box & Filter Radios */}
      {topTab === 'report' && canViewReport && (
        <View style={[styles.summaryBox, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
          <Text style={[styles.summaryTitle, { color: palette.text }]}>
            Total: {reportCounts.total} | Active: {reportCounts.active} | Expired: {reportCounts.expired}
          </Text>
          <View style={[styles.summaryDivider, { backgroundColor: palette.cardBorder }]} />
          <View style={styles.radioRow}>
            <Pressable style={styles.radioBtn} onPress={() => setReportFilter('all')}>
              <Ionicons
                name={reportFilter === 'all' ? 'radio-button-on' : 'radio-button-off-outline'}
                size={18}
                color={palette.accent}
              />
              <Text style={[styles.radioLabel, { color: palette.text }]}>All ({reportCounts.total})</Text>
            </Pressable>

            <Pressable style={styles.radioBtn} onPress={() => setReportFilter('active')}>
              <Ionicons
                name={reportFilter === 'active' ? 'radio-button-on' : 'radio-button-off-outline'}
                size={18}
                color={palette.statusActiveText}
              />
              <Text style={[styles.radioLabel, { color: palette.statusActiveText }]}>Active ({reportCounts.active})</Text>
            </Pressable>

            <Pressable style={styles.radioBtn} onPress={() => setReportFilter('expired')}>
              <Ionicons
                name={reportFilter === 'expired' ? 'radio-button-on' : 'radio-button-off-outline'}
                size={18}
                color={palette.statusExpiredText}
              />
              <Text style={[styles.radioLabel, { color: palette.statusExpiredText }]}>Expired ({reportCounts.expired})</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Main List */}
      {userRole === 'staff' ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={44} color={palette.textFaint} />
          <Text style={[styles.emptyText, { color: palette.textMuted }]}>No staff attendance records configured yet.</Text>
        </View>
      ) : topTab === 'attendance' ? (
        !canMark ? (
          <AccessDenied palette={palette} />
        ) : loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={palette.accent} />
          </View>
        ) : filteredMembers.length === 0 ? (
          <View style={styles.center}>
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>No members found.</Text>
          </View>
        ) : (
          <FlatList
            data={filteredMembers}
            keyExtractor={(item) => item._id}
            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
            renderItem={({ item }) => {
              const rec = todayRecords.find((r) => String(r.memberId?._id || r.memberId) === item._id);
              const isPunchedIn = rec?.status === 'punched_in';
              const isPunching = punchingId === item._id;

              return (
                <Pressable
                  style={[styles.memberCard, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}
                  onPress={() => {
                    if (onOpenMemberDetail) {
                      getMember(item._id).then(onOpenMemberDetail).catch(console.error);
                    }
                  }}
                >
                  <View style={[styles.cardAccent, { backgroundColor: palette.accent }]} />
                  <View style={styles.cardHeader}>
                    <View style={[styles.avatar, { backgroundColor: palette.accentDeep }]}>
                      <Text style={styles.avatarText}>{getInitials(item.name).toUpperCase()}</Text>
                    </View>
                    <View style={styles.cardFields}>
                      <View style={styles.fieldBlock}>
                        <Text style={[styles.fieldLabel, { color: palette.textFaint }]}>Name:</Text>
                        <Text style={[styles.fieldValue, { color: palette.text }]} numberOfLines={1}>{item.name}</Text>
                      </View>
                      <View style={styles.fieldRow}>
                        <View style={[styles.fieldBlock, styles.fieldCol]}>
                          <Text style={[styles.fieldLabel, { color: palette.textFaint }]}>M ID</Text>
                          <Text style={[styles.fieldValue, { color: palette.text }]}>{item.membershipId}</Text>
                        </View>
                        <View style={[styles.fieldBlock, styles.fieldCol]}>
                          <Text style={[styles.fieldLabel, styles.nudgeRight, { color: palette.textFaint }]}>Mobile:</Text>
                          <Text style={[styles.fieldValue, styles.alignRight, { color: palette.text }]} numberOfLines={1}>
                            +91 - {item.mobile}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.fieldRow}>
                        <View style={[styles.fieldBlock, styles.fieldCol]}>
                          <Text style={[styles.fieldLabel, { color: palette.textFaint }]}>Plan Expiry:</Text>
                          <Text style={[styles.fieldValue, { color: getPlanStatus(item.planExpiryDate).color, fontWeight: '800' }]} numberOfLines={1}>{formatDate(item.planExpiryDate)}</Text>
                        </View>
                        <View style={[styles.fieldBlock, styles.fieldCol]}>
                          <Text style={[styles.fieldLabel, styles.alignRight, { color: palette.textFaint }]}>Due Amount:</Text>
                          <Text style={[styles.fieldValue, styles.nudgeRight, { color: palette.text }, item.dueAmount > 0 && { color: palette.accent }]}>
                            ₹{item.dueAmount}
                          </Text>
                        </View>
                      </View>

                      {/* Punch Button */}
                      <View style={styles.punchBtnRow}>
                        <Pressable
                          onPress={() => handlePunch(item)}
                          disabled={isPunching}
                          style={{ borderRadius: 10, overflow: 'hidden' }}
                        >
                          <LinearGradient
                            colors={isPunchedIn ? ['#475569', '#334155'] : palette.gradientColors}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.punchPill}
                          >
                            {isPunching ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <Text style={styles.punchPillText}>
                                {isPunchedIn ? 'Punch Out' : 'Punch In'}
                              </Text>
                            )}
                          </LinearGradient>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            }}
          />
        )
      ) : !canViewReport ? (
        <AccessDenied palette={palette} />
      ) : reportLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={palette.accent} />
        </View>
      ) : filteredReportRecords.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: palette.textMuted }]}>No attendance records for this date.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredReportRecords}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
          renderItem={({ item }) => {
            const m = item.memberId;
            const isExpired = m ? new Date(m.planExpiryDate).getTime() < Date.now() : false;

            return (
              <Pressable
                style={[styles.reportCard, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}
                onPress={() => {
                  if (onOpenMemberDetail && m?._id) {
                    getMember(m._id).then(onOpenMemberDetail).catch(console.error);
                  }
                }}
              >
                <View style={styles.reportCardHeader}>
                  <View style={styles.nameRow}>
                    <Ionicons name="person" size={18} color={palette.accent} style={{ marginRight: 8 }} />
                    <Text style={[styles.reportMemberName, { color: palette.text }]}>{m?.name || 'Unknown Member'}</Text>
                  </View>
                  <Text style={[styles.reportMid, { color: palette.textMuted }]}>M ID - {m?.membershipId || 'N/A'}</Text>
                  <View style={[styles.statusTag, { backgroundColor: isExpired ? palette.statusExpiredBg : palette.statusActiveBg }]}>
                    <Text style={[styles.statusText, { color: isExpired ? palette.statusExpiredText : palette.statusActiveText }]}>
                      {isExpired ? 'Expired' : 'Active'}
                    </Text>
                  </View>
                </View>
                <View style={styles.reportTimeRow}>
                  <View style={styles.timeBlock}>
                    <Ionicons name="arrow-forward-circle" size={18} color={palette.statusActiveText} />
                    <Text style={[styles.timeText, { color: palette.text }]}>In: {formatTime12h(item.punchInTime)}</Text>
                  </View>
                  {item.punchOutTime && (
                    <View style={styles.timeBlock}>
                      <Ionicons name="arrow-back-circle" size={18} color={palette.accent} />
                      <Text style={[styles.timeText, { color: palette.text }]}>Out: {formatTime12h(item.punchOutTime)}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { fontSize: 14, marginTop: 8 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  backBtn: { padding: 4 },
  topTitle: { fontSize: 18, fontWeight: '800' },

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
  topTabText: { fontSize: 14, fontWeight: '600' },

  toggleRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 12,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  toggleText: { fontSize: 13, fontWeight: '600' },

  dateNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    marginTop: 14,
  },
  dateNavSide: { fontSize: 13, fontWeight: '600' },
  dateNavCenter: { fontSize: 16, fontWeight: '800' },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
  },
  searchInput: { flex: 1, fontSize: 14 },

  summaryBox: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  summaryTitle: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  summaryDivider: { height: 1, marginVertical: 10 },
  radioRow: { flexDirection: 'row', justifyContent: 'space-around' },
  radioBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  radioLabel: { fontSize: 13, fontWeight: '600' },

  memberCard: {
    borderWidth: 1,
    borderRadius: 18,
    marginBottom: 16,
    overflow: 'hidden',
    paddingLeft: 14,
  },
  cardAccent: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: 16, paddingBottom: 16, paddingRight: 16 },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 4,
  },
  avatarText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  cardFields: { flex: 1, gap: 12 },
  fieldRow: { flexDirection: 'row', gap: 16 },
  fieldCol: { flex: 1 },
  fieldBlock: { gap: 3 },
  fieldLabel: { fontSize: 11, fontWeight: '600' },
  fieldValue: { fontWeight: '700', fontSize: 12.5 },
  alignRight: { textAlign: 'right' },
  nudgeRight: { paddingLeft: 18 },

  punchBtnRow: { alignItems: 'flex-end', marginTop: 6 },
  punchPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  punchPillText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },

  reportCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  reportCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nameRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  reportMemberName: { fontSize: 15, fontWeight: '800' },
  reportMid: { fontSize: 12, fontWeight: '600', marginRight: 10 },
  statusTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '800' },
  reportTimeRow: { flexDirection: 'row', gap: 20, marginTop: 12 },
  timeBlock: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeText: { fontSize: 13, fontWeight: '700' },
});

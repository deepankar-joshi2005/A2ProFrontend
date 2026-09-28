import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  StyleSheet,
  RefreshControl,
  Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import DateInputField from '../components/DateInputField';
import { getAdmissionReport, AdmissionReportResponse } from '../services/report.service';
import { getMember, Member } from '../services/member.service';
import { formatDate } from '../utils/date';

interface Props {
  onBack: () => void;
  initialFrom?: Date | null;
  initialTo?: Date | null;
  periodLabel?: string;
  onOpenMemberDetail?: (member: Member) => void;
}

const formatINR = (n: number) => `₹ ${Math.round(n || 0).toLocaleString('en-IN')}`;

const toISODateParam = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getInitials = (name: string) => {
  const parts = (name || '').trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
};

export default function AdmissionReportScreen({
  onBack,
  initialFrom,
  initialTo,
  periodLabel,
  onOpenMemberDetail,
}: Props) {
  const insets = useSafeAreaInsets();
  const { isDark, palette } = useTheme();

  const now = new Date();
  const defaultFrom = initialFrom || new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultTo = initialTo || now;

  const [from, setFrom] = useState<Date | null>(defaultFrom);
  const [to, setTo] = useState<Date | null>(defaultTo);
  const [data, setData] = useState<AdmissionReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const accent = isDark ? palette.accent : '#006666';

  const handleCardPress = async (memberId: string) => {
    if (!onOpenMemberDetail) return;
    try {
      const member = await getMember(memberId);
      onOpenMemberDetail(member);
    } catch (err) {
      console.error('Failed to load member detail:', err);
    }
  };

  const loadData = async (f = from, t = to) => {
    try {
      const res = await getAdmissionReport(
        f ? toISODateParam(f) : undefined,
        t ? toISODateParam(t) : undefined
      );
      setData(res);
    } catch (err) {
      console.error('Error fetching admission report:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClear = () => {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    setFrom(startOfMonth);
    setTo(now);
    setLoading(true);
    loadData(startOfMonth, now);
  };

  const getMonthYearText = () => {
    if (periodLabel) return periodLabel;
    const targetDate = from || now;
    const monthShort = targetDate.toLocaleDateString('en-US', { month: 'short' });
    return `${monthShort} ${targetDate.getFullYear()}`;
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {/* Top Header Bar */}
      <View style={[styles.topBar, { backgroundColor: palette.topBarBg }]}>
        <Pressable onPress={onBack} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={palette.topBarText} />
        </Pressable>
        <Text style={[styles.topTitle, { color: palette.topBarText }]}>Admission Report</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor={accent}
          />
        }
      >
        {/* Date Filter Card (Screenshot 2) */}
        <View style={[styles.filterCard, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
          <View style={styles.dateInputsRow}>
            <View style={{ flex: 1 }}>
              <DateInputField
                icon="calendar-outline"
                placeholder="From Date"
                value={from}
                onChange={setFrom}
              />
            </View>
            <View style={{ flex: 1 }}>
              <DateInputField
                icon="calendar-outline"
                placeholder="To Date"
                value={to}
                onChange={setTo}
              />
            </View>
            <Pressable
              style={[styles.menuBtn, { borderColor: palette.inputBorder, backgroundColor: palette.inputBg }]}
              onPress={() => Alert.alert('Options', 'Export options coming soon.')}
              hitSlop={6}
            >
              <Ionicons name="ellipsis-vertical" size={18} color={palette.textMuted} />
            </Pressable>
          </View>

          <View style={styles.actionButtonsRow}>
            <Pressable
              style={[styles.searchBtn, { backgroundColor: accent }]}
              onPress={() => {
                setLoading(true);
                loadData();
              }}
            >
              <Text style={styles.searchBtnText}>Search</Text>
            </Pressable>
            <Pressable style={[styles.clearBtn, { borderColor: accent }]} onPress={handleClear}>
              <Text style={[styles.clearBtnText, { color: accent }]}>Clear</Text>
            </Pressable>
          </View>
        </View>

        {/* Note */}
        <Text style={[styles.noteText, { color: palette.text }]}>
          <Text style={{ fontWeight: '800' }}>Note:</Text> The date filter is applied to the plan start date.
        </Text>

        {/* Banner Button / Bar */}
        <View style={[styles.bannerBar, { backgroundColor: accent }]}>
          <Text style={styles.bannerText}>
            Admission Fees {getMonthYearText()}: {formatINR(data?.totalAdmissionFees ?? 0)}
          </Text>
        </View>

        {/* Member Admission Records List */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={accent} />
          </View>
        ) : !data || data.members.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>
              No admission fees found for this period.
            </Text>
          </View>
        ) : (
          <View style={{ marginTop: 14 }}>
            {data.members.map((m) => (
              <Pressable
                key={m._id}
                onPress={() => handleCardPress(m._id)}
                style={[
                  styles.memberCard,
                  { backgroundColor: palette.cardBg, borderColor: palette.cardBorder },
                ]}
              >
                <View style={styles.memberHeaderRow}>
                  <View style={[styles.avatar, { backgroundColor: accent }]}>
                    <Text style={styles.avatarText}>{getInitials(m.name)}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.detailValueBold, { color: palette.text }]}>{m.name}</Text>
                    <Text style={[styles.detailLabel, { color: palette.textMuted }]}>
                      M ID: {m.membershipId}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.detailLabel, { color: palette.textMuted }]}>Mobile</Text>
                    <Pressable onPress={() => Linking.openURL(`tel:${m.mobile}`)}>
                      <Text style={[styles.detailLink, { color: accent }]}>
                        {m.countryCode || '+91'} - {m.mobile}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: palette.cardBorder }]} />

                <View style={styles.detailGridRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detailLabel, { color: palette.textMuted }]}>Plan</Text>
                    <Text style={[styles.detailValueBold, { color: palette.text }]}>{m.planName}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.detailLabel, { color: palette.textMuted }]}>Admission Fee</Text>
                    <Text style={[styles.detailValueBold, { color: palette.statusActiveText }]}>
                      {formatINR(m.admissionFees)}
                    </Text>
                  </View>
                </View>

                <View style={[styles.detailGridRow, { marginTop: 10 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detailLabel, { color: palette.textMuted }]}>Admission Date</Text>
                    <Text style={[styles.detailValueBold, { color: palette.text }]}>
                      {formatDate(m.joiningDate)}
                    </Text>
                  </View>
                  {m.paymentMethod && (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.detailLabel, { color: palette.textMuted }]}>Payment Method</Text>
                      <Text style={[styles.detailValueBold, { color: palette.text }]}>
                        {m.paymentMethod}
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  topTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  scroll: { flex: 1 },
  filterCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  dateInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuBtn: {
    width: 44,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  searchBtn: {
    paddingHorizontal: 22,
    paddingVertical: 9,
    borderRadius: 8,
  },
  searchBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  clearBtn: {
    paddingHorizontal: 22,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  clearBtnText: {
    fontWeight: '800',
    fontSize: 13,
  },
  noteText: {
    fontSize: 13,
    marginBottom: 12,
    marginTop: 4,
  },
  bannerBar: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  bannerText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  center: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  memberCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  memberHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  detailLabel: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  detailValueBold: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  detailLink: {
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  detailGridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

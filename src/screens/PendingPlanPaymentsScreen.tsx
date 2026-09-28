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
import { getPlanDue, PlanDueResponse, PlanDueMember } from '../services/report.service';
import { getMember, Member } from '../services/member.service';
import { formatDate } from '../utils/date';

interface Props {
  onBack: () => void;
  isPT?: boolean;
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

function calculatePendingSinceDays(dateStr?: string): string {
  if (!dateStr) return '0 days';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '0 days';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  return `${days} days`;
}

export default function PendingPlanPaymentsScreen({
  onBack,
  isPT = false,
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
  const [data, setData] = useState<PlanDueResponse | null>(null);
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
      const res = await getPlanDue(
        f ? toISODateParam(f) : undefined,
        t ? toISODateParam(t) : undefined,
        isPT
      );
      setData(res);
    } catch (err) {
      console.error('Error fetching plan due:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPT]);

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

  const title = isPT ? 'Pending PT Plan Payments' : 'Pending Plan Payments';
  const heading = isPT ? 'PT Member Due Plan:' : 'Member Due Plan:';

  return (
    <View style={[styles.root, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {/* Top Header Bar */}
      <View style={[styles.topBar, { backgroundColor: palette.topBarBg }]}>
        <Pressable onPress={onBack} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={palette.topBarText} />
        </Pressable>
        <Text style={[styles.topTitle, { color: palette.topBarText }]}>{title}</Text>
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
        {/* Filter Card */}
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

        {/* Banner Bar */}
        <View style={[styles.bannerBar, { backgroundColor: accent }]}>
          <Text style={styles.bannerText}>
            {getMonthYearText()} Due Amount: {formatINR(data?.dueAmount ?? 0)}
          </Text>
        </View>

        {/* Section Heading */}
        <Text style={[styles.sectionHeading, { color: palette.text }]}>{heading}</Text>

        {/* Members Cards List (Screenshot 3 layout) */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={accent} />
          </View>
        ) : !data || data.members.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>
              {isPT ? 'No pending PT plan payments found.' : 'No pending plan payments found.'}
            </Text>
          </View>
        ) : (
          <View style={{ marginTop: 6 }}>
            {data.members.map((m: PlanDueMember) => {
              const pendingDays = calculatePendingSinceDays(m.purchaseDate || m.planStartDate);
              return (
                <Pressable
                  key={m._id}
                  onPress={() => handleCardPress(m._id)}
                  style={[
                    styles.memberCardContainer,
                    { backgroundColor: palette.cardBg, borderColor: palette.cardBorder },
                  ]}
                >
                  {/* Left Accent Bar */}
                  <View style={[styles.leftAccentBar, { backgroundColor: accent }]} />

                  <View style={styles.cardContent}>
                    {/* Header Row: Avatar, Name, M ID, Mobile */}
                    <View style={styles.cardHeaderRow}>
                      <View style={[styles.avatarCircle, { backgroundColor: accent }]}>
                        <Text style={styles.avatarCircleText}>{getInitials(m.name)}</Text>
                      </View>

                      <View style={{ flex: 1, marginLeft: 14 }}>
                        <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Name</Text>
                        <Text style={[styles.nameValue, { color: palette.text }]}>{m.name}</Text>

                        <View style={styles.midMobileRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.labelSmall, { color: palette.textMuted }]}>M ID</Text>
                            <Text style={[styles.boldText, { color: palette.text }]}>
                              {m.membershipId}
                            </Text>
                          </View>
                          <View style={{ flex: 1.6 }}>
                            <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Mobile</Text>
                            <Pressable onPress={() => Linking.openURL(`tel:${m.mobile}`)}>
                              <Text style={[styles.mobileLink, { color: accent }]}>
                                {m.countryCode || '+91'} - {m.mobile}
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Divider */}
                    <View style={[styles.cardDivider, { backgroundColor: palette.cardBorder }]} />

                    {/* Plan Details Grid */}
                    <View style={styles.gridSection}>
                      {/* Plan Name */}
                      <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Plan Name</Text>
                      <Text style={[styles.boldTextLarge, { color: palette.text, marginBottom: 10 }]}>
                        {m.planName || 'Plan'}
                      </Text>

                      {/* Row: Purchase Date & Pending Since */}
                      <View style={styles.twoColumnRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Purchase Date</Text>
                          <Text style={[styles.boldText, { color: palette.text }]}>
                            {formatDate(m.purchaseDate || m.planStartDate)}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Pending Since</Text>
                          <Text style={[styles.boldText, { color: '#E53935' }]}>
                            {pendingDays}
                          </Text>
                        </View>
                      </View>

                      {/* Row: Expiry Date */}
                      <View style={[styles.twoColumnRow, { marginTop: 10 }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Expiry Date</Text>
                          <Text style={[styles.boldText, { color: palette.text }]}>
                            {formatDate(m.planExpiryDate)}
                          </Text>
                        </View>
                      </View>

                      {/* Row: Complete Amount & Due Amount */}
                      <View style={[styles.twoColumnRow, { marginTop: 10 }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Complete Amount</Text>
                          <Text style={[styles.boldText, { color: palette.text }]}>
                            {formatINR(m.completeAmount || (m.dueAmount + (m.paidAmount || 0)))}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Due Amount</Text>
                          <Text style={[styles.boldText, { color: palette.text }]}>
                            {formatINR(m.dueAmount)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })}
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
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
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
  memberCardContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 14,
  },
  leftAccentBar: {
    width: 5,
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircleText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 22,
  },
  labelSmall: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  nameValue: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  midMobileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  boldText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  boldTextLarge: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  mobileLink: {
    fontSize: 13.5,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  cardDivider: {
    height: 1,
    marginVertical: 12,
  },
  gridSection: {},
  twoColumnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

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
import {
  getGymServices,
  GymServiceRecord,
  GymServiceResponse,
} from '../services/report.service';
import { getMember, Member } from '../services/member.service';
import { formatDate } from '../utils/date';

interface Props {
  onBack: () => void;
  initialType?: 'paid' | 'due' | 'all';
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

export default function ServiceReportScreen({
  onBack,
  initialType = 'paid',
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
  const [serviceType, setServiceType] = useState<'paid' | 'due' | 'all'>(initialType);
  const [data, setData] = useState<GymServiceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add Service Modal State removed — service is added from GymServicesScreen

  const accent = isDark ? palette.accent : '#006666';

  const handleCardPress = async (memberId: string | undefined) => {
    if (!onOpenMemberDetail || !memberId) return;
    try {
      const member = await getMember(memberId);
      onOpenMemberDetail(member);
    } catch (err) {
      console.error('Failed to load member detail:', err);
    }
  };

  const loadData = async (f = from, t = to, type = serviceType) => {
    try {
      const res = await getGymServices({
        from: f ? toISODateParam(f) : undefined,
        to: t ? toISODateParam(t) : undefined,
        type: type === 'all' ? undefined : type,
      });
      setData(res);
    } catch (err) {
      console.error('Error fetching gym services:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceType]);

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
        <Text style={[styles.topTitle, { color: palette.topBarText }]}>
          {serviceType === 'due' ? 'Pending Service Payments' : 'Service Report'}
        </Text>
      </View>

      {/* Service Type Switcher Tabs */}
      <View style={[styles.switcherRow, { backgroundColor: isDark ? '#161922' : '#F1F5F9' }]}>
        <Pressable
          style={[styles.switchBtn, serviceType === 'paid' && { backgroundColor: accent }]}
          onPress={() => setServiceType('paid')}
        >
          <Text style={[styles.switchText, { color: serviceType === 'paid' ? '#FFFFFF' : palette.textMuted }]}>
            Service Paid
          </Text>
        </Pressable>
        <Pressable
          style={[styles.switchBtn, serviceType === 'due' && { backgroundColor: accent }]}
          onPress={() => setServiceType('due')}
        >
          <Text style={[styles.switchText, { color: serviceType === 'due' ? '#FFFFFF' : palette.textMuted }]}>
            Service Due
          </Text>
        </Pressable>
        <Pressable
          style={[styles.switchBtn, serviceType === 'all' && { backgroundColor: accent }]}
          onPress={() => setServiceType('all')}
        >
          <Text style={[styles.switchText, { color: serviceType === 'all' ? '#FFFFFF' : palette.textMuted }]}>
            All
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
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
        {/* Date Filter Card */}
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
              onPress={() => Alert.alert('Options', 'Export coming soon.')}
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

        {/* Banner Bar */}
        <View style={[styles.bannerBar, { backgroundColor: accent }]}>
          <Text style={styles.bannerText}>
            {getMonthYearText()}{' '}
            {serviceType === 'due' ? 'Service Due Amount' : 'Service Paid Amount'}:{' '}
            {formatINR(serviceType === 'due' ? data?.totalDue ?? 0 : data?.totalPaid ?? 0)}
          </Text>
        </View>

        <Text style={[styles.sectionHeading, { color: palette.text }]}>
          {serviceType === 'due' ? 'Members with Service Dues:' : 'Service Records:'}
        </Text>

        {/* Service Cards List */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={accent} />
          </View>
        ) : !data || data.services.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>
              {serviceType === 'due'
                ? 'No pending service dues found.'
                : 'No service payments found for this period.'}
            </Text>
          </View>
        ) : (
          <View style={{ marginTop: 6 }}>
            {data.services.map((s: GymServiceRecord) => {
              const mem = s.memberId;
              const name = mem?.name || 'Member';
              const mobile = mem?.mobile || '';
              const mId = mem?.membershipId || '-';

              return (
                <Pressable
                  key={s._id}
                  onPress={() => handleCardPress(mem?._id)}
                  style={[
                    styles.memberCardContainer,
                    { backgroundColor: palette.cardBg, borderColor: palette.cardBorder },
                  ]}
                >
                  <View style={[styles.leftAccentBar, { backgroundColor: accent }]} />

                  <View style={styles.cardContent}>
                    {/* Header Row */}
                    <View style={styles.cardHeaderRow}>
                      <View style={[styles.avatarCircle, { backgroundColor: accent }]}>
                        <Text style={styles.avatarCircleText}>{getInitials(name)}</Text>
                      </View>

                      <View style={{ flex: 1, marginLeft: 14 }}>
                        <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Name</Text>
                        <Text style={[styles.nameValue, { color: palette.text }]}>{name}</Text>

                        <View style={styles.midMobileRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.labelSmall, { color: palette.textMuted }]}>M ID</Text>
                            <Text style={[styles.boldText, { color: palette.text }]}>{mId}</Text>
                          </View>
                          {mobile && (
                            <View style={{ flex: 1.6 }}>
                              <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Mobile</Text>
                              <Pressable onPress={() => Linking.openURL(`tel:${mobile}`)}>
                                <Text style={[styles.mobileLink, { color: accent }]}>
                                  +91 - {mobile}
                                </Text>
                              </Pressable>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>

                    <View style={[styles.cardDivider, { backgroundColor: palette.cardBorder }]} />

                    {/* Service Details */}
                    <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Service</Text>
                    <Text style={[styles.boldTextLarge, { color: palette.text, marginBottom: 8 }]}>
                      {s.serviceName}
                    </Text>

                    <View style={styles.twoColumnRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Date</Text>
                        <Text style={[styles.boldText, { color: palette.text }]}>
                          {formatDate(s.date)}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Paid Amount</Text>
                        <Text style={[styles.boldText, { color: palette.statusActiveText }]}>
                          {formatINR(s.paidAmount)}
                        </Text>
                      </View>
                    </View>

                    {s.dueAmount > 0 && (
                      <View style={[styles.twoColumnRow, { marginTop: 10 }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Payment Method</Text>
                          <Text style={[styles.boldText, { color: palette.text }]}>
                            {s.paymentMethod}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Due Amount</Text>
                          <Text style={[styles.boldText, { color: '#E53935' }]}>
                            {formatINR(s.dueAmount)}
                          </Text>
                        </View>
                      </View>
                    )}
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
  backBtn: { padding: 4 },
  topTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  switcherRow: {
    flexDirection: 'row',
    padding: 6,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 10,
    gap: 6,
  },
  switchBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  switchText: {
    fontSize: 13,
    fontWeight: '700',
  },
  scroll: { flex: 1 },
  filterCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginTop: 10,
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
  twoColumnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  floatingAddBtn: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 6,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  floatingAddBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  searchInputInline: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
  },
  selectedMemberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  memberDropdownList: {
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 6,
    overflow: 'hidden',
  },
  memberOptionItem: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  methodPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  methodPillText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  saveExpenseBtn: {
    marginTop: 26,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveExpenseBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});

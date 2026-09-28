import { useEffect, useState } from 'react';
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
  Dimensions,
  Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { usePermissions } from '../context/PermissionsContext';
import AccessDenied from '../components/AccessDenied';
import { formatDate } from '../utils/date';
import DateInputField from '../components/DateInputField';
import OptionSheet, { SheetOption } from '../components/OptionSheet';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  getTrends,
  getCollectionSummary,
  getPlanDue,
  getSales,
  TrendsPeriod,
  TrendsResponse,
  CollectionSummaryResponse,
  CollectionBucket,
  PlanDueResponse,
  SalesResponse,
} from '../services/report.service';
import { getMember, Member } from '../services/member.service';

interface Props {
  onLogout: () => void;
  onNavigateTab?: (tab: 'members' | 'dashboard' | 'reports' | 'gym') => void;
  initialTab?: ReportTab;
  initialFrom?: Date | null;
  initialTo?: Date | null;
  onOpenMemberDetail?: (member: Member) => void;
}

type ReportTab = 'trends' | 'sales' | 'plan_due' | 'pt_plan_due' | 'collection';

const showComingSoon = (label: string) => Alert.alert('Coming Soon', `${label} is not available yet.`);

const formatINR = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

const getInitials = (name: string) => {
  const parts = (name || '').trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
};

const toISODateParam = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const PAYMENT_METHOD_OPTIONS: SheetOption[] = [
  { label: 'All Payment Methods', value: 'all' },
  { label: 'Cash', value: 'Cash' },
  { label: 'Card', value: 'Card' },
  { label: 'UPI', value: 'UPI' },
  { label: 'Bank Transfer', value: 'Bank Transfer' },
  { label: 'Other', value: 'Other' },
];

const PLAN_TYPE_OPTIONS: SheetOption[] = [
  { label: 'All Plan Types', value: 'all' },
  { label: 'Regular Plans', value: 'regular' },
  { label: 'PT Plans', value: 'pt' },
];

const REPORT_TABS: { key: ReportTab; label: string }[] = [
  { key: 'trends', label: 'Trends' },
  { key: 'sales', label: 'Sales' },
  { key: 'plan_due', label: 'Plan Due' },
  { key: 'pt_plan_due', label: 'PT Plan Due' },
  { key: 'collection', label: 'Collection' },
];

export default function ReportsScreen({ onLogout, onNavigateTab, initialTab, initialFrom, initialTo, onOpenMemberDetail }: Props) {
  const insets = useSafeAreaInsets();
  const { isDark, palette, toggleTheme } = useTheme();
  const { role, can } = usePermissions();
  const isStaff = role === 'staff';

  // Every tab shows for staff exactly as it does for admin. Sales / Plan Due /
  // PT Plan Due have no permission toggle, so they're always usable; Trends
  // and Collection show an Access Denied panel below if that staff lacks it.
  const canViewTrends = !isStaff || can('reports.trends');
  const canViewCollection = !isStaff || can('reports.collection');

  const [activeTab, setActiveTab] = useState<ReportTab>(initialTab || 'trends');
  const [logoutVisible, setLogoutVisible] = useState(false);

  const openMenu = () => setLogoutVisible(true);

  return (
    <View style={[styles.root, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {/* Top Bar Header */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <Image source={require('../../assets/A2ProLogo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.brandName, { color: palette.text }]}>Reports</Text>
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

      {/* Report Section Tabs (horizontally scrollable) */}
      <View style={[styles.tabRowWrap, { backgroundColor: isDark ? '#0F1015' : '#FFFFFF', borderBottomColor: palette.surfaceBorder }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRowContent}>
          {REPORT_TABS.map((t) => {
            const active = activeTab === t.key;
            return (
              <Pressable
                key={t.key}
                style={[styles.reportTabBtn, active && { borderBottomColor: isDark ? palette.accent : '#006666' }]}
                onPress={() => setActiveTab(t.key)}
              >
                <Text
                  style={[
                    styles.reportTabText,
                    { color: palette.textMuted },
                    active && { color: palette.text, fontWeight: '800' },
                  ]}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Active Tab Content */}
      {activeTab === 'trends' && (canViewTrends ? <TrendsTab isDark={isDark} palette={palette} insets={insets} /> : <AccessDenied palette={palette} />)}
      {activeTab === 'sales' && (
        <SalesTab
          isDark={isDark}
          palette={palette}
          insets={insets}
          initialFrom={initialFrom}
          initialTo={initialTo}
          onOpenMemberDetail={onOpenMemberDetail}
        />
      )}
      {activeTab === 'plan_due' && <PlanDueTab isDark={isDark} palette={palette} insets={insets} ptOnly={false} onOpenMemberDetail={onOpenMemberDetail} />}
      {activeTab === 'pt_plan_due' && <PlanDueTab isDark={isDark} palette={palette} insets={insets} ptOnly onOpenMemberDetail={onOpenMemberDetail} />}
      {activeTab === 'collection' && (canViewCollection ? <CollectionTab isDark={isDark} palette={palette} insets={insets} /> : <AccessDenied palette={palette} />)}

      {/* Bottom Navigation Tab Bar - identical for staff and admin */}
      <View style={[styles.tabBar, { backgroundColor: palette.tabBarBg, borderTopColor: palette.tabBarBorder, paddingBottom: insets.bottom || 10 }]}>
        <BottomTabItem icon="people-outline" label="Members" onPress={() => onNavigateTab?.('members')} palette={palette} />
        <BottomTabItem icon="pie-chart-outline" label="Dashboard" onPress={() => onNavigateTab?.('dashboard')} palette={palette} />
        <BottomTabItem icon="document-text" label="Reports" active palette={palette} />
        <BottomTabItem icon="business-outline" label="Gym" onPress={() => onNavigateTab?.('gym')} palette={palette} />
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

/* ==================== TRENDS TAB ==================== */

const PERIOD_OPTIONS: { key: TrendsPeriod; label: string }[] = [
  { key: 'week', label: 'Week' },
  { key: 'quarter', label: 'Quarter' },
  { key: 'six_month', label: 'Six Mon...' },
  { key: 'yearly', label: 'Yearly' },
];

function TrendsTab({ isDark, palette, insets }: { isDark: boolean; palette: any; insets: any }) {
  const [period, setPeriod] = useState<TrendsPeriod>('week');
  const [view, setView] = useState<'graph' | 'table'>('table');
  const [data, setData] = useState<TrendsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const accent = isDark ? palette.accent : '#006666';

  const load = async () => {
    try {
      const res = await getTrends(period);
      setData(res);
    } catch (err) {
      console.error('Error loading trends:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    load();
  }, [period]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 120 }}
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
      {/* Period pills + Graph/Table toggle */}
      <View style={styles.trendsFilterRow}>
        <View style={[styles.filterPillRow, { flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F1F5F9' }]}>
          {PERIOD_OPTIONS.map((p) => (
            <Pressable
              key={p.key}
              style={[styles.filterPillBtn, period === p.key && { backgroundColor: accent }]}
              onPress={() => setPeriod(p.key)}
            >
              <Text style={[styles.filterPillText, { color: period === p.key ? '#FFFFFF' : palette.textMuted }]} numberOfLines={1}>
                {p.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={[styles.segmentToggle, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F1F5F9' }]}>
          <Pressable
            style={[styles.segmentBtn, view === 'graph' && { backgroundColor: accent }]}
            onPress={() => setView('graph')}
          >
            <Text style={[styles.segmentText, { color: view === 'graph' ? '#FFFFFF' : palette.textMuted }]}>Graph</Text>
          </Pressable>
          <Pressable
            style={[styles.segmentBtn, view === 'table' && { backgroundColor: accent }]}
            onPress={() => setView('table')}
          >
            <Text style={[styles.segmentText, { color: view === 'table' ? '#FFFFFF' : palette.textMuted }]}>Table</Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={accent} />
        </View>
      ) : (
        <>
          <Text style={[styles.centerSectionTitle, { color: palette.text }]}>Collected Payment</Text>
          {view === 'table' ? (
            <SimpleTable
              palette={palette}
              rows={data?.collectedPayment ?? []}
              valueFormatter={(v) => formatINR(v)}
            />
          ) : (
            <View style={[styles.chartCard, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
              <BarChart data={data?.collectedPayment ?? []} color={accent} palette={palette} prefix="₹" />
            </View>
          )}

          <Text style={[styles.centerSectionTitle, { color: palette.text, marginTop: 26 }]}>New Member</Text>
          {view === 'table' ? (
            <SimpleTable palette={palette} rows={data?.newMembers ?? []} valueFormatter={(v) => String(v)} />
          ) : (
            <View style={[styles.chartCard, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
              <BarChart data={data?.newMembers ?? []} color={accent} palette={palette} prefix="" />
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function SimpleTable({
  palette,
  rows,
  valueFormatter,
}: {
  palette: any;
  rows: { label: string; value: number }[];
  valueFormatter: (v: number) => string;
}) {
  return (
    <View style={[styles.tableWrap, { borderColor: palette.cardBorder }]}>
      <View style={[styles.tableHeaderRow, { backgroundColor: palette.isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }]}>
        <Text style={[styles.tableHeaderCell, { color: palette.text }]}>Date</Text>
        <Text style={[styles.tableHeaderCell, { color: palette.text, textAlign: 'right' }]}>Value</Text>
      </View>
      {rows.map((r, i) => (
        <View
          key={r.label + '_' + i}
          style={[styles.tableRow, { borderTopColor: palette.cardBorder, backgroundColor: palette.cardBg }]}
        >
          <Text style={[styles.tableCell, { color: palette.text }]}>{r.label}</Text>
          <Text style={[styles.tableCell, { color: palette.text, textAlign: 'right' }]}>{valueFormatter(r.value)}</Text>
        </View>
      ))}
    </View>
  );
}

function BarChart({
  data,
  color,
  palette,
  prefix,
}: {
  data: { label: string; value: number }[];
  color: string;
  palette: any;
  prefix: string;
}) {
  const width = Math.min(Dimensions.get('window').width - 64, 700);
  const height = 190;
  const paddingBottom = 30;
  const paddingTop = 22;
  const chartHeight = height - paddingBottom - paddingTop;
  const max = Math.max(1, ...data.map((d) => d.value));
  const count = Math.max(1, data.length);
  const gap = data.length > 8 ? 4 : 10;
  const barWidth = Math.max(6, (width - gap * (count + 1)) / count);
  const labelFontSize = data.length > 8 ? 8 : 10;

  return (
    <Svg width={width} height={height}>
      <Line x1={0} y1={height - paddingBottom} x2={width} y2={height - paddingBottom} stroke={palette.surfaceBorder} strokeWidth={1} />
      {data.map((d, i) => {
        const barHeight = max > 0 ? (d.value / max) * chartHeight : 0;
        const x = gap + i * (barWidth + gap);
        const y = height - paddingBottom - Math.max(barHeight, d.value > 0 ? 2 : 0);
        return (
          <Rect key={'bar_' + i} x={x} y={y} width={barWidth} height={Math.max(barHeight, d.value > 0 ? 2 : 0)} rx={4} fill={color} />
        );
      })}
      {data.map((d, i) => {
        if (!d.value) return null;
        const barHeight = max > 0 ? (d.value / max) * chartHeight : 0;
        const x = gap + i * (barWidth + gap) + barWidth / 2;
        const y = height - paddingBottom - barHeight - 6;
        return (
          <SvgText key={'val_' + i} x={x} y={Math.max(y, 12)} fontSize={9} fontWeight="700" fill={palette.text} textAnchor="middle">
            {prefix}
            {d.value}
          </SvgText>
        );
      })}
      {data.map((d, i) => {
        const x = gap + i * (barWidth + gap) + barWidth / 2;
        return (
          <SvgText key={'lbl_' + i} x={x} y={height - paddingBottom + 16} fontSize={labelFontSize} fill={palette.textMuted} textAnchor="middle">
            {d.label}
          </SvgText>
        );
      })}
    </Svg>
  );
}

/* ==================== SHARED FILTER BAR (Date range + Search/Clear) ==================== */

function DateRangeFilterBar({
  isDark,
  palette,
  from,
  to,
  onChangeFrom,
  onChangeTo,
  onSearch,
  onClear,
  extraSelects,
}: {
  isDark: boolean;
  palette: any;
  from: Date | null;
  to: Date | null;
  onChangeFrom: (d: Date) => void;
  onChangeTo: (d: Date) => void;
  onSearch: () => void;
  onClear: () => void;
  extraSelects?: React.ReactNode;
}) {
  const accent = isDark ? palette.accent : '#006666';
  return (
    <View>
      <View style={styles.dateRow}>
        <View style={{ flex: 1 }}>
          <DateInputField icon="calendar-outline" placeholder="From Date" value={from} onChange={onChangeFrom} />
        </View>
        <View style={{ flex: 1 }}>
          <DateInputField icon="calendar-outline" placeholder="To Date" value={to} onChange={onChangeTo} />
        </View>
        <Pressable
          style={[styles.iconMenuBtn, { borderColor: palette.inputBorder, backgroundColor: palette.inputBg }]}
          onPress={() => showComingSoon('Export')}
          hitSlop={6}
        >
          <Ionicons name="ellipsis-vertical" size={18} color={palette.textMuted} />
        </Pressable>
      </View>

      {extraSelects}

      <View style={styles.searchClearRow}>
        <Pressable style={[styles.searchBtn, { backgroundColor: accent }]} onPress={onSearch}>
          <Text style={styles.searchBtnText}>Search</Text>
        </Pressable>
        <Pressable style={[styles.clearBtn, { borderColor: accent }]} onPress={onClear}>
          <Text style={[styles.clearBtnText, { color: accent }]}>Clear</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SelectField({
  palette,
  label,
  onPress,
}: {
  palette: any;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.selectField, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder }]}
      onPress={onPress}
    >
      <Text style={[styles.selectFieldText, { color: palette.text }]} numberOfLines={1}>
        {label}
      </Text>
      <Ionicons name="chevron-down" size={16} color={palette.textMuted} />
    </Pressable>
  );
}

/* ==================== SALES TAB ==================== */

function SalesTab({
  isDark,
  palette,
  insets,
  initialFrom,
  initialTo,
  onOpenMemberDetail,
}: {
  isDark: boolean;
  palette: any;
  insets: any;
  initialFrom?: Date | null;
  initialTo?: Date | null;
  onOpenMemberDetail?: (member: Member) => void;
}) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [from, setFrom] = useState<Date | null>(initialFrom !== undefined ? initialFrom : startOfMonth);
  const [to, setTo] = useState<Date | null>(initialTo !== undefined ? initialTo : now);
  const [paymentMethod, setPaymentMethod] = useState('all');
  const [planType, setPlanType] = useState('all');
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [showPlanTypeSheet, setShowPlanTypeSheet] = useState(false);
  const [data, setData] = useState<SalesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const accent = isDark ? palette.accent : '#006666';

  const load = async (f = from, t = to, pm = paymentMethod, pt = planType) => {
    try {
      const res = await getSales({
        from: f ? toISODateParam(f) : undefined,
        to: t ? toISODateParam(t) : undefined,
        paymentMethod: pm,
        planType: pt,
      });
      setData(res);
    } catch (err) {
      console.error('Error loading sales:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClear = () => {
    setFrom(startOfMonth);
    setTo(now);
    setPaymentMethod('all');
    setPlanType('all');
    setLoading(true);
    load(startOfMonth, now, 'all', 'all');
  };

  const handleCardPress = async (memberId: string) => {
    if (!onOpenMemberDetail) return;
    try {
      const member = await getMember(memberId);
      onOpenMemberDetail(member);
    } catch (err) {
      console.error('Failed to load member detail:', err);
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 120 }}
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
      <DateRangeFilterBar
        isDark={isDark}
        palette={palette}
        from={from}
        to={to}
        onChangeFrom={setFrom}
        onChangeTo={setTo}
        onSearch={() => {
          setLoading(true);
          load();
        }}
        onClear={handleClear}
        extraSelects={
          <View style={styles.selectRow}>
            <View style={{ flex: 1 }}>
              <SelectField
                palette={palette}
                label={PAYMENT_METHOD_OPTIONS.find((o) => o.value === paymentMethod)?.label || 'Select Payment Method'}
                onPress={() => setShowPaymentSheet(true)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <SelectField
                palette={palette}
                label={PLAN_TYPE_OPTIONS.find((o) => o.value === planType)?.label || 'Select Plan Type'}
                onPress={() => setShowPlanTypeSheet(true)}
              />
            </View>
          </View>
        }
      />

      <View style={[styles.bannerBar, { backgroundColor: accent }]}>
        <Text style={styles.bannerText}>This Month: Collection</Text>
        <Text style={styles.bannerAmount}>{formatINR(data?.thisMonthCollection ?? 0)}</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={accent} />
        </View>
      ) : !data || data.sales.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: palette.textMuted }]}>No sales records found for this filter.</Text>
        </View>
      ) : (
        <View style={{ marginTop: 14 }}>
          {data.sales.map((s) => (
            <Pressable
              key={s._id}
              onPress={() => handleCardPress(s._id)}
              style={[styles.saleCard, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}
            >
              <View style={styles.saleHeaderRow}>
                <View style={[styles.saleAvatar, { backgroundColor: accent }]}>
                  <Text style={styles.saleAvatarText}>{getInitials(s.name)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.detailLabel, { color: palette.textMuted }]}>Name</Text>
                  <Text style={[styles.detailValueBold, { color: palette.text }]}>{s.name}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.detailLabel, { color: palette.textMuted }]}>Mobile</Text>
                  <Pressable onPress={() => Linking.openURL(`tel:${s.mobile}`)}>
                    <Text style={[styles.detailLink, { color: accent }]}>
                      {s.countryCode || '+91'} - {s.mobile}
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={[styles.detailDivider, { backgroundColor: palette.cardBorder }]} />

              <View style={styles.detailGridRow}>
                <DetailCell label="M ID" value={s.membershipId} palette={palette} />
                <DetailCell label="Invoice No" value={s.invoiceNo} palette={palette} align="right" />
              </View>
              <View style={[styles.detailGridRow, { marginTop: 10 }]}>
                <DetailCell label="Date" value={formatDate(s.date)} palette={palette} />
                <DetailCell label="Payment Method" value={s.paymentMethod || '-'} palette={palette} align="right" />
              </View>
              <View style={[styles.detailGridRow, { marginTop: 10 }]}>
                <DetailCell label="Paid Amount" value={formatINR(s.paidAmount)} palette={palette} valueColor={palette.statusActiveText} />
                <DetailCell
                  label="Remaining Amount"
                  value={formatINR(s.dueAmount)}
                  palette={palette}
                  align="right"
                  valueColor={s.dueAmount > 0 ? palette.statusExpiredText : palette.text}
                />
              </View>
              <View style={[styles.detailGridRow, { marginTop: 10 }]}>
                <DetailCell label="Plan name" value={s.planName} palette={palette} />
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <OptionSheet
        visible={showPaymentSheet}
        title="Select Payment Method"
        options={PAYMENT_METHOD_OPTIONS}
        selectedValue={paymentMethod}
        onSelect={setPaymentMethod}
        onClose={() => setShowPaymentSheet(false)}
      />
      <OptionSheet
        visible={showPlanTypeSheet}
        title="Select Plan Type"
        options={PLAN_TYPE_OPTIONS}
        selectedValue={planType}
        onSelect={setPlanType}
        onClose={() => setShowPlanTypeSheet(false)}
      />
    </ScrollView>
  );
}

function DetailCell({
  label,
  value,
  palette,
  align = 'left',
  valueColor,
}: {
  label: string;
  value: string;
  palette: any;
  align?: 'left' | 'right';
  valueColor?: string;
}) {
  return (
    <View style={{ flex: 1, alignItems: align === 'right' ? 'flex-end' : 'flex-start' }}>
      <Text style={[styles.detailLabel, { color: palette.textMuted }]}>{label}</Text>
      <Text style={[styles.detailValueBold, { color: valueColor || palette.text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/* ==================== PLAN DUE / PT PLAN DUE TAB ==================== */

function PlanDueTab({
  isDark,
  palette,
  insets,
  ptOnly,
  onOpenMemberDetail,
}: {
  isDark: boolean;
  palette: any;
  insets: any;
  ptOnly: boolean;
  onOpenMemberDetail?: (member: Member) => void;
}) {
  const [from, setFrom] = useState<Date | null>(null);
  const [to, setTo] = useState<Date | null>(null);
  const [data, setData] = useState<PlanDueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const accent = isDark ? palette.accent : '#006666';

  const load = async (f = from, t = to) => {
    try {
      const res = await getPlanDue(f ? toISODateParam(f) : undefined, t ? toISODateParam(t) : undefined, ptOnly);
      setData(res);
    } catch (err) {
      console.error('Error loading plan due:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ptOnly]);

  const handleClear = () => {
    setFrom(null);
    setTo(null);
    setLoading(true);
    load(null, null);
  };

  const handleCardPress = async (memberId: string) => {
    if (!onOpenMemberDetail) return;
    try {
      const member = await getMember(memberId);
      onOpenMemberDetail(member);
    } catch (err) {
      console.error('Failed to load member detail:', err);
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 120 }}
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
      <DateRangeFilterBar
        isDark={isDark}
        palette={palette}
        from={from}
        to={to}
        onChangeFrom={setFrom}
        onChangeTo={setTo}
        onSearch={() => {
          setLoading(true);
          load();
        }}
        onClear={handleClear}
      />

      <Text style={[styles.noteText, { color: palette.textFaint }]}>
        Note: The date filter is applied to the plan start date.
      </Text>

      <View style={[styles.bannerBarFull, { backgroundColor: accent }]}>
        <Text style={styles.bannerFullText}>
          {ptOnly ? 'PT Due Amount' : 'Due Amount'}: {formatINR(data?.dueAmount ?? 0)}
        </Text>
      </View>

      <Text style={[styles.sectionHeaderLeft, { color: palette.text }]}>
        {ptOnly ? 'PT Member Due Plan:' : 'Member Due Plan:'}
      </Text>

      <View
        style={[
          styles.dueListContainer,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F1F5F9', borderColor: palette.cardBorder },
        ]}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={accent} />
          </View>
        ) : !data || data.members.length === 0 ? (
          <View style={[styles.center, { paddingVertical: 40 }]}>
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>
              {ptOnly ? 'No PT plan dues found.' : 'No due members found.'}
            </Text>
          </View>
        ) : (
          data.members.map((m) => (
            <Pressable
              key={m._id}
              onPress={() => handleCardPress(String(m._id))}
              style={[styles.dueMemberRow, { borderBottomColor: palette.cardBorder }]}
            >
              <View style={[styles.saleAvatar, { backgroundColor: accent }]}>
                <Text style={styles.saleAvatarText}>{getInitials(m.name)}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.detailValueBold, { color: palette.text }]}>{m.name}</Text>
                <Text style={[styles.detailLabel, { color: palette.textMuted }]}>
                  M ID {m.membershipId} · {m.planName || 'Plan'}
                </Text>
                <Pressable onPress={() => Linking.openURL(`tel:${m.mobile}`)}>
                  <Text style={[styles.detailLink, { color: accent, marginTop: 2 }]}>
                    {m.countryCode || '+91'} - {m.mobile}
                  </Text>
                </Pressable>
              </View>
              <Text style={[styles.dueAmountText, { color: palette.statusExpiredText }]}>{formatINR(m.dueAmount)}</Text>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}

/* ==================== COLLECTION TAB ==================== */

function CollectionTab({ isDark, palette, insets }: { isDark: boolean; palette: any; insets: any }) {
  const [from, setFrom] = useState<Date | null>(null);
  const [to, setTo] = useState<Date | null>(null);
  const [data, setData] = useState<CollectionSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const accent = isDark ? palette.accent : '#006666';

  const load = async (f = from, t = to) => {
    try {
      const res = await getCollectionSummary(f ? toISODateParam(f) : undefined, t ? toISODateParam(t) : undefined);
      setData(res);
    } catch (err) {
      console.error('Error loading collection summary:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClear = () => {
    setFrom(null);
    setTo(null);
    setLoading(true);
    load(null, null);
  };

  const buckets: { key: keyof CollectionSummaryResponse; label: string }[] = [
    { key: 'allMemberships', label: 'All Memberships' },
    { key: 'fullyPaid', label: 'Fully Paid' },
    { key: 'partiallyPaid', label: 'Partially Paid' },
    { key: 'notPaid', label: 'Not Paid' },
  ];

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 120 }}
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
      <DateRangeFilterBar
        isDark={isDark}
        palette={palette}
        from={from}
        to={to}
        onChangeFrom={setFrom}
        onChangeTo={setTo}
        onSearch={() => {
          setLoading(true);
          load();
        }}
        onClear={handleClear}
      />

      <Text style={[styles.noteText, { color: palette.textFaint }]}>
        Note: The date filter is applied to the plan start date.
      </Text>

      <Text style={[styles.centerSectionTitle, { color: palette.text, marginTop: 8 }]}>Plan Collection Summary</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={accent} />
        </View>
      ) : (
        <View style={{ marginTop: 10 }}>
          {buckets.map((b) => {
            const bucket: CollectionBucket | undefined = data?.[b.key];
            return (
              <View
                key={b.key}
                style={[
                  styles.collectionCard,
                  {
                    backgroundColor: isDark ? 'rgba(147,51,234,0.08)' : '#F5F3FF',
                    borderColor: isDark ? 'rgba(147,51,234,0.25)' : '#E9D8FD',
                  },
                ]}
              >
                <Text style={[styles.collectionTitle, { color: palette.text }]}>
                  {b.label}: {bucket?.count ?? 0}
                </Text>
                <View style={styles.collectionRow}>
                  <Text style={[styles.collectionLabel, { color: palette.textMuted }]}>Complete Amount</Text>
                  <Text style={[styles.collectionAmount, { color: palette.text }]}>{formatINR(bucket?.completeAmount ?? 0)}</Text>
                </View>
                <View style={styles.collectionRow}>
                  <Text style={[styles.collectionLabel, { color: palette.textMuted }]}>
                    Received: <Text style={{ color: palette.statusActiveText, fontWeight: '800' }}>{formatINR(bucket?.received ?? 0)}</Text>
                  </Text>
                  <Text style={[styles.collectionLabel, { color: palette.textMuted }]}>
                    Balance due: <Text style={{ color: palette.statusExpiredText, fontWeight: '800' }}>{formatINR(bucket?.balanceDue ?? 0)}</Text>
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
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

  tabRowWrap: { borderBottomWidth: 1 },
  tabRowContent: { paddingHorizontal: 12 },
  reportTabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  reportTabText: { fontSize: 14, fontWeight: '600' },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 13.5, fontWeight: '500', textAlign: 'center' },

  /* Trends */
  trendsFilterRow: { flexDirection: 'row', gap: 8, marginBottom: 18, alignItems: 'flex-start' },
  filterPillRow: { flexDirection: 'row', borderRadius: 12, padding: 4, gap: 4 },
  filterPillBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  filterPillText: { fontSize: 11, fontWeight: '700' },
  segmentToggle: { flexDirection: 'row', borderRadius: 12, padding: 4, gap: 2 },
  segmentBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  segmentText: { fontSize: 11, fontWeight: '700' },

  centerSectionTitle: { fontSize: 15, fontWeight: '800', textAlign: 'center', marginBottom: 12 },

  tableWrap: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  tableHeaderRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 14 },
  tableHeaderCell: { flex: 1, fontSize: 13, fontWeight: '800' },
  tableRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 14, borderTopWidth: 1 },
  tableCell: { flex: 1, fontSize: 13.5, fontWeight: '500' },

  chartCard: { borderRadius: 14, borderWidth: 1, padding: 10, alignItems: 'center' },

  /* Filter bar shared */
  dateRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  iconMenuBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
  },
  selectFieldText: { fontSize: 13, fontWeight: '600', flex: 1, marginRight: 6 },
  searchClearRow: { flexDirection: 'row', gap: 10, marginTop: 12, justifyContent: 'flex-end' },
  searchBtn: { paddingHorizontal: 22, paddingVertical: 10, borderRadius: 10 },
  searchBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  clearBtn: { paddingHorizontal: 22, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5 },
  clearBtnText: { fontWeight: '700', fontSize: 13 },

  noteText: { fontSize: 12, fontStyle: 'italic', marginTop: 12, marginBottom: 4 },

  bannerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginTop: 16,
  },
  bannerText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  bannerAmount: { color: '#FFFFFF', fontWeight: '900', fontSize: 18 },

  bannerBarFull: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  bannerFullText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },

  sectionHeaderLeft: { fontSize: 15, fontWeight: '800', marginTop: 20, marginBottom: 10 },

  dueListContainer: { borderRadius: 14, borderWidth: 1, minHeight: 140, overflow: 'hidden' },
  dueMemberRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1 },
  dueAmountText: { fontSize: 15, fontWeight: '900' },

  /* Sale / detail card */
  saleCard: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 14 },
  saleHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  saleAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  saleAvatarText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  detailDivider: { height: 1, marginVertical: 12 },
  detailGridRow: { flexDirection: 'row' },
  detailLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 3, letterSpacing: 0.3 },
  detailValueBold: { fontSize: 14, fontWeight: '700' },
  detailLink: { fontSize: 13.5, fontWeight: '700', textDecorationLine: 'underline' },

  /* Collection cards */
  collectionCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 14 },
  collectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 10 },
  collectionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  collectionLabel: { fontSize: 13, fontWeight: '600' },
  collectionAmount: { fontSize: 14, fontWeight: '800' },

  /* Bottom Tab Bar */
  tabBar: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 10 },
  tabItem: { flex: 1, alignItems: 'center', gap: 3 },
  tabLabel: { fontSize: 11, fontWeight: '600' },
});

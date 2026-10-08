import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatDate } from '../utils/date';
import { getPlanStatus, calculateDefaultEndDate } from '../utils/planStatus';
import {
  listPlans,
  renewMemberPlan,
  Member,
  MembershipPlan,
} from '../services/member.service';
import OptionSheet, { SheetOption } from '../components/OptionSheet';
import DateInputField from '../components/DateInputField';
import WhatsappRenewModal from '../components/WhatsappRenewModal';
import { useTheme } from '../context/ThemeContext';

interface Props {
  member: Member;
  onBack: () => void;
  onRenewed: () => void;
}

const PAYMENT_METHODS: SheetOption[] = [
  { label: 'Cash', value: 'Cash' },
  { label: 'Card', value: 'Card' },
  { label: 'UPI', value: 'UPI' },
  { label: 'Bank Transfer', value: 'Bank Transfer' },
  { label: 'Other', value: 'Other' },
];

export default function RenewPlanScreen({ member, onBack, onRenewed }: Props) {
  const insets = useSafeAreaInsets();
  const { isDark, palette } = useTheme();

  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [planId, setPlanId] = useState<string | null>(member.planId?._id || null);
  const [planPickerVisible, setPlanPickerVisible] = useState(false);

  const now = new Date();
  const [startDate, setStartDate] = useState<Date | null>(now);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [paymentDate, setPaymentDate] = useState<Date | null>(now);
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string | null>(member.paymentMethod || 'Cash');
  const [methodPickerVisible, setMethodPickerVisible] = useState(false);
  const [comments, setComments] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [admissionFees, setAdmissionFees] = useState('');
  const [saving, setSaving] = useState(false);
  const [renewedMember, setRenewedMember] = useState<Member | null>(null);

  useEffect(() => {
    listPlans()
      .then((data) => {
        setPlans(data);
        if (!planId && data.length > 0) {
          setPlanId(data[0]._id);
          setEndDate(calculateDefaultEndDate(now, data[0]));
        }
      })
      .catch(() => {});
  }, []);

  const selectedPlan = plans.find((p) => p._id === planId) ?? member.planId ?? null;
  const planAmount = selectedPlan?.amount ?? 0;

  useEffect(() => {
    if (selectedPlan && startDate) {
      setEndDate(calculateDefaultEndDate(startDate, selectedPlan));
    }
  }, [selectedPlan?._id]);

  const handleSelectPlan = (id: string) => {
    setPlanId(id);
    const plan = plans.find((p) => p._id === id);
    if (plan) {
      const baseStart = startDate || new Date();
      setEndDate(calculateDefaultEndDate(baseStart, plan));
    }
  };

  const handleStartDateChange = (date: Date | null) => {
    setStartDate(date);
    if (date && selectedPlan) {
      setEndDate(calculateDefaultEndDate(date, selectedPlan));
    }
  };

  const dueAmount = useMemo(() => {
    const discount =
      discountType === 'percent'
        ? (planAmount * (Number(discountValue) || 0)) / 100
        : Number(discountValue) || 0;
    return Math.max(0, planAmount - discount + (Number(admissionFees) || 0) - (Number(paidAmount) || 0));
  }, [planAmount, discountType, discountValue, admissionFees, paidAmount]);

  const handleSave = async () => {
    if (!planId) {
      Alert.alert('Error', 'Please select a gym plan');
      return;
    }
    if (!startDate) {
      Alert.alert('Error', 'Please select Plan Start Date');
      return;
    }
    if (!endDate) {
      Alert.alert('Error', 'Please select Plan End Date');
      return;
    }
    setSaving(true);
    try {
      const updated = await renewMemberPlan(member._id, {
        planId,
        planStartDate: startDate.toISOString(),
        planExpiryDate: endDate.toISOString(),
        paymentDate: paymentDate ? paymentDate.toISOString() : undefined,
        paidAmount: Number(paidAmount) || 0,
        paymentMethod: paymentMethod ?? undefined,
        discountType,
        discountValue: Number(discountValue) || 0,
        admissionFees: Number(admissionFees) || 0,
        comments,
      });

      setRenewedMember(updated);
    } catch (err: any) {
      Alert.alert('Renewal Failed', err?.response?.data?.message || 'Could not renew plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {/* Top Header Bar */}
      <View style={[styles.topBar, { backgroundColor: palette.topBarBg, borderBottomColor: palette.surfaceBorder }]}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={palette.topBarText} />
        </Pressable>
        <Text style={[styles.topTitle, { color: palette.topBarText }]}>Renew Plan</Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Member Banner Card */}
          <View style={[styles.memberBannerCard, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
            <Ionicons name="person-circle" size={42} color={isDark ? palette.accent : '#006666'} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerName, { color: palette.text }]}>{member.name}</Text>
              <Text style={[styles.bannerMid, { color: palette.textMuted }]}>
                M ID: {member.membershipId} | Mobile: {member.mobile}
              </Text>
              <Text style={[styles.bannerExpiry, { color: getPlanStatus(member.planExpiryDate).color }]}>
                Current Expiry: {formatDate(member.planExpiryDate)}
              </Text>
            </View>
          </View>

          {/* Select Gym Plan Dropdown */}
          <Text style={[styles.groupLabel, { color: palette.textMuted }]}>Select Gym Plan *</Text>
          <Pressable
            style={[styles.inputWrap, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder }]}
            onPress={() => setPlanPickerVisible(true)}
          >
            <Ionicons name="clipboard-outline" size={18} color={isDark ? palette.accent : '#006666'} style={{ marginRight: 10 }} />
            <Text style={selectedPlan ? [styles.valueText, { color: palette.text }] : [styles.placeholderText, { color: palette.textFaint }]}>
              {selectedPlan ? `${selectedPlan.name} (${selectedPlan.amount})` : 'Select Gym Plan'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={palette.textMuted} />
          </Pressable>

          <Text style={[styles.plainAmountText, { color: palette.text }]}>
            Plan Amount: ₹ {planAmount.toLocaleString('en-IN')}
          </Text>

          {/* Plan Start Date */}
          <Text style={[styles.groupLabel, { color: palette.textMuted }]}>Plan Start Date *</Text>
          <DateInputField
            icon="calendar-outline"
            placeholder="Plan Start Date *"
            value={startDate}
            onChange={handleStartDateChange}
          />

          {/* Plan End Date */}
          <Text style={[styles.groupLabel, { color: palette.textMuted }]}>Plan End Date *</Text>
          <DateInputField
            icon="calendar-outline"
            placeholder="Plan End Date *"
            value={endDate}
            onChange={setEndDate}
          />

          {/* Payment Date */}
          <Text style={[styles.groupLabel, { color: palette.textMuted }]}>Payment Date</Text>
          <DateInputField
            icon="calendar-outline"
            placeholder="Payment Date"
            value={paymentDate}
            onChange={setPaymentDate}
          />

          {/* Paid Amount */}
          <Text style={[styles.groupLabel, { color: palette.textMuted }]}>Paid Amount</Text>
          <View style={[styles.inputWrap, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder }]}>
            <Ionicons name="cash-outline" size={18} color={isDark ? palette.accent : '#006666'} style={{ marginRight: 10 }} />
            <TextInput
              style={[styles.input, { color: palette.text }]}
              placeholder="Paid Amount"
              placeholderTextColor={palette.textFaint}
              value={paidAmount}
              onChangeText={(t) => setPaidAmount(t.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
            />
          </View>

          {/* Payment Method Dropdown */}
          <Text style={[styles.groupLabel, { color: palette.textMuted }]}>Payment Method</Text>
          <Pressable
            style={[styles.inputWrap, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder }]}
            onPress={() => setMethodPickerVisible(true)}
          >
            <Ionicons name="card-outline" size={18} color={isDark ? palette.accent : '#006666'} style={{ marginRight: 10 }} />
            <Text style={paymentMethod ? [styles.valueText, { color: palette.text }] : [styles.placeholderText, { color: palette.textFaint }]}>
              {paymentMethod ?? 'Select Payment Method'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={palette.textMuted} />
          </Pressable>

          <Text style={[styles.plainAmountText, { color: palette.text }]}>
            Due Amount: ₹ {dueAmount.toLocaleString('en-IN')}
          </Text>

          {/* Comments Multiline */}
          <Text style={[styles.groupLabel, { color: palette.textMuted }]}>Comments</Text>
          <View style={[styles.inputWrap, styles.inputWrapMultiline, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder }]}>
            <Ionicons name="chatbubble-outline" size={18} color={isDark ? palette.accent : '#006666'} style={{ marginRight: 10 }} />
            <TextInput
              style={[styles.input, { color: palette.text, textAlignVertical: 'top' }]}
              placeholder="Comments"
              placeholderTextColor={palette.textFaint}
              value={comments}
              onChangeText={setComments}
              multiline
            />
          </View>

          {/* Discount Section */}
          <View style={styles.discountHeaderRow}>
            <Ionicons name="filter-outline" size={16} color={palette.textMuted} />
            <Text style={[styles.groupLabel, { color: palette.textMuted, marginTop: 0 }]}>Discount in Plan:</Text>
          </View>

          <View style={styles.radioRow}>
            <Pressable style={styles.radioOption} onPress={() => setDiscountType('percent')}>
              <Ionicons
                name={discountType === 'percent' ? 'radio-button-on' : 'radio-button-off-outline'}
                size={18}
                color={isDark ? palette.accent : '#006666'}
              />
              <Text style={[styles.radioLabel, { color: palette.text }]}>Percent</Text>
            </Pressable>
            <Pressable style={styles.radioOption} onPress={() => setDiscountType('amount')}>
              <Ionicons
                name={discountType === 'amount' ? 'radio-button-on' : 'radio-button-off-outline'}
                size={18}
                color={isDark ? palette.accent : '#006666'}
              />
              <Text style={[styles.radioLabel, { color: palette.text }]}>Amount</Text>
            </Pressable>
          </View>

          {/* Discount Field */}
          <View style={[styles.inputWrap, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, marginTop: 10 }]}>
            <Ionicons name="pricetag-outline" size={18} color={isDark ? palette.accent : '#006666'} style={{ marginRight: 10 }} />
            <TextInput
              style={[styles.input, { color: palette.text }]}
              placeholder="Discount"
              placeholderTextColor={palette.textFaint}
              value={discountValue}
              onChangeText={(t) => setDiscountValue(t.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
            />
          </View>

          {/* Admission Fees Field */}
          <Text style={[styles.groupLabel, { color: palette.textMuted }]}>Admission Fees</Text>
          <View style={[styles.inputWrap, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder }]}>
            <Ionicons name="swap-horizontal-outline" size={18} color={isDark ? palette.accent : '#006666'} style={{ marginRight: 10 }} />
            <TextInput
              style={[styles.input, { color: palette.text }]}
              placeholder="Admission Fees"
              placeholderTextColor={palette.textFaint}
              value={admissionFees}
              onChangeText={(t) => setAdmissionFees(t.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
            />
          </View>

          {/* RENEW PLAN Action Button */}
          <Pressable onPress={handleSave} disabled={saving} style={{ marginTop: 24 }}>
            <LinearGradient
              colors={palette.gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveBtn}
            >
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveBtnText}>RENEW PLAN</Text>}
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <OptionSheet
        visible={planPickerVisible}
        title="Select Gym Plan"
        options={plans.map((p) => ({ label: `${p.name} (${p.amount})`, value: p._id }))}
        selectedValue={planId}
        onSelect={handleSelectPlan}
        onClose={() => setPlanPickerVisible(false)}
      />
      <OptionSheet
        visible={methodPickerVisible}
        title="Payment Method"
        options={PAYMENT_METHODS}
        selectedValue={paymentMethod}
        onSelect={setPaymentMethod}
        onClose={() => setMethodPickerVisible(false)}
      />

      <WhatsappRenewModal
        visible={!!renewedMember}
        member={renewedMember || member}
        planName={selectedPlan?.name}
        startDate={startDate}
        expiryDate={renewedMember?.planExpiryDate}
        paidAmount={Number(paidAmount) || 0}
        dueAmount={dueAmount}
        onDone={() => {
          setRenewedMember(null);
          onRenewed();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  topTitle: { fontSize: 18, fontWeight: '800' },

  memberBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  bannerName: { fontSize: 16, fontWeight: '800' },
  bannerMid: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  bannerExpiry: { fontSize: 12, fontWeight: '700', marginTop: 4 },

  groupLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  inputWrapMultiline: { height: 80, alignItems: 'flex-start', paddingVertical: 12 },
  input: { flex: 1, fontSize: 15 },
  valueText: { flex: 1, fontSize: 15 },
  placeholderText: { flex: 1, fontSize: 15 },
  plainAmountText: { fontSize: 14, fontWeight: '700', marginTop: 10, marginLeft: 4 },

  discountHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  radioRow: { flexDirection: 'row', gap: 24, marginTop: 6 },
  radioOption: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  radioLabel: { fontSize: 14, fontWeight: '600' },

  saveBtn: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: 2 },
});

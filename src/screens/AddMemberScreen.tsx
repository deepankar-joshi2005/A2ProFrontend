import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { isValidEmail } from '../utils/validation';
import OptionSheet, { SheetOption } from '../components/OptionSheet';
import DateInputField from '../components/DateInputField';
import WhatsappOnboardingModal from '../components/WhatsappOnboardingModal';
import {
  createMember,
  getNextMembershipId,
  checkMembershipIdAvailable,
  listPlans,
  Member,
  MembershipPlan,
} from '../services/member.service';

interface Props {
  onBack: () => void;
  onSaved: () => void;
}

const PAYMENT_METHODS: SheetOption[] = [
  { label: 'Cash', value: 'Cash' },
  { label: 'Card', value: 'Card' },
  { label: 'UPI', value: 'UPI' },
  { label: 'Bank Transfer', value: 'Bank Transfer' },
  { label: 'Other', value: 'Other' },
];

export default function AddMemberScreen({ onBack, onSaved }: Props) {
  const insets = useSafeAreaInsets();
  const { isDark, palette } = useTheme();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [mobile, setMobile] = useState('');
  const [membershipId, setMembershipId] = useState('');
  const [membershipIdStatus, setMembershipIdStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [planId, setPlanId] = useState<string | null>(null);
  const [planPickerVisible, setPlanPickerVisible] = useState(false);

  const [joiningDate, setJoiningDate] = useState<Date | null>(new Date());
  const [paymentDate, setPaymentDate] = useState<Date | null>(null);
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [methodPickerVisible, setMethodPickerVisible] = useState(false);
  const [comments, setComments] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [admissionFees, setAdmissionFees] = useState('');

  const [email, setEmail] = useState('');
  const [dob, setDob] = useState<Date | null>(null);
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [savedMember, setSavedMember] = useState<Member | null>(null);

  const idCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    listPlans()
      .then((data) => {
        setPlans(data);
        if (data.length > 0) setPlanId(data[0]._id);
      })
      .catch(() => {});
    getNextMembershipId()
      .then((id) => {
        setMembershipId(id);
        setMembershipIdStatus('available');
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!membershipId) {
      setMembershipIdStatus('idle');
      return;
    }
    setMembershipIdStatus('checking');
    if (idCheckTimer.current) clearTimeout(idCheckTimer.current);
    idCheckTimer.current = setTimeout(async () => {
      try {
        const available = await checkMembershipIdAvailable(membershipId);
        setMembershipIdStatus(available ? 'available' : 'taken');
      } catch {
        setMembershipIdStatus('idle');
      }
    }, 400);
    return () => {
      if (idCheckTimer.current) clearTimeout(idCheckTimer.current);
    };
  }, [membershipId]);

  const selectedPlan = plans.find((p) => p._id === planId) ?? null;
  const planAmount = selectedPlan?.amount ?? 0;

  const dueAmount = useMemo(() => {
    const discount =
      discountType === 'percent'
        ? (planAmount * (Number(discountValue) || 0)) / 100
        : Number(discountValue) || 0;
    return Math.max(0, planAmount - discount + (Number(admissionFees) || 0) - (Number(paidAmount) || 0));
  }, [planAmount, discountType, discountValue, admissionFees, paidAmount]);

  const openPhotoPicker = () => {
    if (Platform.OS === 'web') {
      pickFromGallery();
      return;
    }
    Alert.alert('Add Photo', 'Choose an option', [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Gallery', onPress: pickFromGallery },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Camera access is required to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Gallery access is required to choose a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const handleSave = async () => {
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = 'Name is required';
    if (!/^\d{10}$/.test(mobile.trim())) nextErrors.mobile = 'Enter a valid 10-digit mobile number';
    if (!membershipId.trim()) nextErrors.membershipId = 'Membership ID is required';
    else if (membershipIdStatus === 'taken') nextErrors.membershipId = 'This Membership ID is already in use';
    if (!planId) nextErrors.plan = 'Select a gym plan';
    if (!joiningDate) nextErrors.joiningDate = 'Select a joining date';
    if (!isValidEmail(email)) nextErrors.email = 'Enter a valid email address';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      const member = await createMember(
        {
          name: name.trim(),
          gender,
          countryCode: '+91',
          mobile: mobile.trim(),
          membershipId: membershipId.trim(),
          planId: planId as string,
          joiningDate: (joiningDate as Date).toISOString(),
          paymentDate: paymentDate ? paymentDate.toISOString() : undefined,
          paidAmount: Number(paidAmount) || 0,
          paymentMethod: paymentMethod ?? undefined,
          comments,
          discountType,
          discountValue: Number(discountValue) || 0,
          admissionFees: Number(admissionFees) || 0,
          email: email.trim(),
          password: password.trim() || undefined,
          dob: dob ? dob.toISOString() : undefined,
          address,
          notes,
        },
        photoUri
      );
      setSavedMember(member);
    } catch (err: any) {
      Alert.alert('Could not save member', err?.response?.data?.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const idHelperText =
    membershipIdStatus === 'available'
      ? 'Membership ID is available'
      : membershipIdStatus === 'taken'
      ? 'This Membership ID is already in use'
      : membershipIdStatus === 'checking'
      ? 'Checking availability…'
      : '';
  const idHelperColor =
    membershipIdStatus === 'available'
      ? palette.statusActiveText
      : membershipIdStatus === 'taken'
      ? palette.statusExpiredText
      : palette.textMuted;

  return (
    <View style={[styles.root, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <StatusBar style="light" />

      <View style={[styles.topBar, { backgroundColor: palette.topBarBg, borderBottomColor: palette.surfaceBorder }]}>
        <Pressable onPress={onBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={palette.topBarText} />
        </Pressable>
        <Text style={[styles.topTitle, { color: palette.topBarText }]}>Add Member</Text>
        <Pressable onPress={() => Alert.alert('Coming Soon', 'Settings is not available yet.')} hitSlop={8}>
          <Ionicons name="settings-outline" size={20} color={palette.topBarText} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Section 1 */}
          <View style={styles.photoWrap}>
            <Pressable style={[styles.photoCircle, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]} onPress={openPhotoPicker}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoImage} />
              ) : (
                <Ionicons name="person" size={54} color={palette.textFaint} />
              )}
              <View style={[styles.cameraBadge, { backgroundColor: palette.accent, borderColor: palette.background }]}>
                <Ionicons name="camera" size={16} color="#FFFFFF" />
              </View>
            </Pressable>
          </View>

          <Field icon="person-outline" placeholder="Name *" value={name} onChangeText={setName} error={errors.name} palette={palette} />

          <Text style={[styles.groupLabel, { color: palette.textMuted }]}>Gender</Text>
          <View style={styles.genderRow}>
            <RadioOption
              icon="male"
              label="Male"
              selected={gender === 'male'}
              onPress={() => setGender('male')}
              palette={palette}
            />
            <RadioOption
              icon="female"
              label="Female"
              selected={gender === 'female'}
              onPress={() => setGender('female')}
              palette={palette}
            />
          </View>

          <View style={styles.mobileRow}>
            <View style={[styles.countryCode, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder }]}>
              <Text style={[styles.countryCodeText, { color: palette.text }]}>🇮🇳 +91</Text>
              <Ionicons name="chevron-down" size={14} color={palette.textMuted} />
            </View>
            <View style={[styles.inputWrap, { flex: 1, backgroundColor: palette.inputBg, borderColor: palette.inputBorder }, !!errors.mobile && { borderColor: palette.statusExpiredText }]}>
              <Ionicons name="call-outline" size={18} color={palette.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: palette.text }]}
                placeholder="Enter mobile number"
                placeholderTextColor={palette.textFaint}
                value={mobile}
                onChangeText={(t) => setMobile(t.replace(/[^0-9]/g, ''))}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
          </View>
          {!!errors.mobile && <Text style={[styles.errorText, { color: palette.statusExpiredText }]}>{errors.mobile}</Text>}

          <Text style={[styles.groupLabel, { color: palette.textMuted }]}>Membership ID</Text>
          <View
            style={[
              styles.inputWrap,
              {
                backgroundColor: palette.inputBg,
                borderColor: membershipIdStatus === 'idle' ? palette.inputBorder : idHelperColor,
              },
            ]}
          >
            <Ionicons name="card-outline" size={18} color={palette.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: palette.text }]}
              value={membershipId}
              onChangeText={setMembershipId}
              placeholder="Membership ID"
              placeholderTextColor={palette.textFaint}
            />
          </View>
          {!!idHelperText && <Text style={[styles.helperText, { color: idHelperColor }]}>{idHelperText}</Text>}

          <Text style={[styles.groupLabel, { color: palette.textMuted }]}>Batch / Group Class</Text>
          <View style={[styles.inputWrap, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder }]}>
            <Ionicons name="people-outline" size={18} color={palette.textMuted} style={styles.inputIcon} />
            <Text style={[styles.staticPlaceholder, { color: palette.textFaint }]}>No Batch Found</Text>
          </View>

          {/* Section 2 */}
          <SectionHeader title="Plan Details" palette={palette} />

          <Text style={[styles.groupLabel, { color: palette.textMuted }]}>Select Gym Plan</Text>
          <Pressable style={[styles.inputWrap, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder }]} onPress={() => setPlanPickerVisible(true)}>
            <Ionicons name="document-text-outline" size={18} color={palette.textMuted} style={styles.inputIcon} />
            <Text style={selectedPlan ? [styles.valueText, { color: palette.text }] : [styles.staticPlaceholder, { color: palette.textFaint }]}>
              {selectedPlan ? `${selectedPlan.name} (${selectedPlan.amount})` : 'Select Gym Plan'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={palette.textMuted} />
          </Pressable>
          {!!errors.plan && <Text style={[styles.errorText, { color: palette.statusExpiredText }]}>{errors.plan}</Text>}

          <Text style={[styles.plainAmountText, { color: palette.text }]}>Plan Amount: ₹ {planAmount.toLocaleString('en-IN')}</Text>

          <Text style={[styles.groupLabel, { color: palette.textMuted }]}>Select Joining Date</Text>
          <DateInputField icon="calendar-outline" placeholder="Select Joining Date" value={joiningDate} onChange={setJoiningDate} />
          {!!errors.joiningDate && <Text style={[styles.errorText, { color: palette.statusExpiredText }]}>{errors.joiningDate}</Text>}

          <Text style={[styles.groupLabel, { color: palette.textMuted }]}>Payment Date</Text>
          <DateInputField icon="calendar-outline" placeholder="Payment Date" value={paymentDate} onChange={setPaymentDate} />

          <Field
            icon="cash-outline"
            placeholder="Paid Amount"
            value={paidAmount}
            onChangeText={(t) => setPaidAmount(t.replace(/[^0-9.]/g, ''))}
            keyboardType="numeric"
            label="Paid Amount"
            palette={palette}
          />

          <Text style={[styles.groupLabel, { color: palette.textMuted }]}>Payment Method</Text>
          <Pressable style={[styles.inputWrap, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder }]} onPress={() => setMethodPickerVisible(true)}>
            <Ionicons name="card-outline" size={18} color={palette.textMuted} style={styles.inputIcon} />
            <Text style={paymentMethod ? [styles.valueText, { color: palette.text }] : [styles.staticPlaceholder, { color: palette.textFaint }]}>
              {paymentMethod ?? 'Select Payment Method'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={palette.textMuted} />
          </Pressable>

          <Text style={[styles.plainAmountText, { color: palette.text }]}>Due Amount: ₹ {dueAmount.toLocaleString('en-IN')}</Text>

          <Field
            icon="chatbubble-outline"
            placeholder="Comments"
            value={comments}
            onChangeText={setComments}
            multiline
            label="Comments"
            palette={palette}
          />

          <View style={styles.discountHeaderRow}>
            <Ionicons name="filter-outline" size={16} color={palette.textMuted} />
            <Text style={[styles.groupLabel, { color: palette.textMuted, marginTop: 0 }]}>Discount in Plan:</Text>
          </View>
          <View style={styles.genderRow}>
            <RadioOption label="Percent" selected={discountType === 'percent'} onPress={() => setDiscountType('percent')} palette={palette} />
            <RadioOption label="Amount" selected={discountType === 'amount'} onPress={() => setDiscountType('amount')} palette={palette} />
          </View>

          <Field
            icon={discountType === 'percent' ? 'pricetag-outline' : 'cash-outline'}
            placeholder="Discount"
            value={discountValue}
            onChangeText={(t) => setDiscountValue(t.replace(/[^0-9.]/g, ''))}
            keyboardType="numeric"
            label="Discount"
            palette={palette}
          />

          <Field
            icon="swap-horizontal-outline"
            placeholder="Admission Fees"
            value={admissionFees}
            onChangeText={(t) => setAdmissionFees(t.replace(/[^0-9.]/g, ''))}
            keyboardType="numeric"
            label="Admission Fees"
            palette={palette}
          />

          {/* Section 3 */}
          <SectionHeader title="Member Details" palette={palette} />

          <Field
            icon="mail-outline"
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
            label="Email"
            palette={palette}
          />

          <Text style={[styles.groupLabel, { color: palette.textMuted }]}>Date of Birth</Text>
          <DateInputField
            icon="calendar-outline"
            placeholder="Date of Birth"
            value={dob}
            onChange={setDob}
          />

          <Field icon="home-outline" placeholder="Address" value={address} onChangeText={setAddress} label="Address" palette={palette} />
          <Field icon="clipboard-outline" placeholder="Notes" value={notes} onChangeText={setNotes} multiline label="Notes" palette={palette} />

          {/* Section 4 – Portal Login */}
          <SectionHeader title="Member Portal Login" palette={palette} />
          <Text style={[styles.groupLabel, { color: palette.textMuted, marginBottom: 6 }]}>
            Set a password for this member's gym app login.{'\n'}Leave blank to use default: 123456
          </Text>
          <View style={[styles.inputWrap, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder }]}>
            <Ionicons name="lock-closed-outline" size={18} color={palette.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: palette.text }]}
              placeholder="Portal Password (min 6 chars)"
              placeholderTextColor={palette.textFaint}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <Pressable onPress={() => setShowPassword(s => !s)} hitSlop={8}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={palette.textMuted} />
            </Pressable>
          </View>


          <Pressable onPress={handleSave} disabled={saving} style={{ marginTop: 12 }}>
            <LinearGradient
              colors={palette.gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveBtn}
            >
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveBtnText}>SAVE MEMBER</Text>}
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <OptionSheet
        visible={planPickerVisible}
        title="Select Gym Plan"
        options={plans.map((p) => ({ label: `${p.name} (${p.amount})`, value: p._id }))}
        selectedValue={planId}
        onSelect={setPlanId}
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

      <WhatsappOnboardingModal
        visible={!!savedMember}
        member={savedMember}
        password={password.trim().length >= 6 ? password.trim() : '123456'}
        onDone={() => {
          setSavedMember(null);
          onSaved();
        }}
      />
    </View>
  );
}

function SectionHeader({ title, palette }: { title: string; palette: any }) {
  return <Text style={[styles.sectionHeader, { color: palette.text, borderTopColor: palette.surfaceBorder }]}>{title}</Text>;
}

function Field({
  icon,
  placeholder,
  value,
  onChangeText,
  error,
  multiline,
  keyboardType,
  autoCapitalize,
  label,
  palette,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  error?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences';
  label?: string;
  palette: any;
}) {
  return (
    <View>
      {!!label && <Text style={[styles.groupLabel, { color: palette.textMuted }]}>{label}</Text>}
      <View style={[styles.inputWrap, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder }, multiline && styles.inputWrapMultiline, !!error && { borderColor: palette.statusExpiredText }]}>
        <Ionicons name={icon} size={18} color={palette.textMuted} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { color: palette.text }, multiline && styles.inputMultiline]}
          placeholder={placeholder}
          placeholderTextColor={palette.textFaint}
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
        />
      </View>
      {!!error && <Text style={[styles.errorText, { color: palette.statusExpiredText }]}>{error}</Text>}
    </View>
  );
}

function RadioOption({
  icon,
  label,
  selected,
  onPress,
  palette,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  selected: boolean;
  onPress: () => void;
  palette: any;
}) {
  return (
    <Pressable style={styles.radioOption} onPress={onPress}>
      <View style={[styles.radioCircle, { borderColor: palette.textMuted }, selected && { borderColor: palette.accent }]}>
        {selected && <View style={[styles.radioDot, { backgroundColor: palette.accent }]} />}
      </View>
      {icon && <Ionicons name={icon} size={16} color={palette.textMuted} style={{ marginRight: 4 }} />}
      <Text style={[styles.radioLabel, { color: palette.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  topTitle: { fontSize: 17, fontWeight: '800' },

  photoWrap: { alignItems: 'center', marginBottom: 20 },
  photoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoImage: { width: '100%', height: '100%' },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },

  groupLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 26,
    marginBottom: 6,
    borderTopWidth: 1,
    paddingTop: 20,
  },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  inputWrapMultiline: { height: 84, alignItems: 'flex-start', paddingVertical: 12 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15 },
  inputMultiline: { height: '100%', textAlignVertical: 'top' },
  valueText: { flex: 1, fontSize: 15 },
  staticPlaceholder: { flex: 1, fontSize: 15 },
  errorText: { fontSize: 12, marginTop: 4, marginLeft: 4 },
  helperText: { fontSize: 12, marginTop: 4, marginLeft: 4 },
  plainAmountText: { fontSize: 14, fontWeight: '700', marginTop: 10, marginLeft: 4 },

  genderRow: { flexDirection: 'row', gap: 20, marginBottom: 4 },
  radioOption: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 9, height: 9, borderRadius: 4.5 },
  radioLabel: { fontSize: 14 },

  mobileRow: { flexDirection: 'row', gap: 8 },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 52,
  },
  countryCodeText: { fontSize: 14 },

  discountHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },

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


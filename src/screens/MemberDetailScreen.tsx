import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Share,
  Image,
  StyleSheet,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { usePermissions } from '../context/PermissionsContext';
import AccessDenied from '../components/AccessDenied';
import { formatDate } from '../utils/date';
import { BASE_URL } from '../config/api';

// Helper: build image URI — Cloudinary URLs are already full https://, local paths need BASE_URL prefix
const getPhotoUri = (photoUrl: string | null): string | null => {
  if (!photoUrl) return null;
  if (photoUrl.startsWith('http')) return photoUrl;
  return `${BASE_URL}${photoUrl}`;
};
import {
  getMember,
  clearMemberPlan,
  toggleFreezeMember,
  toggleBlockMember,
  assignMemberBatch,
  updateMemberPhoto,
  Member,
} from '../services/member.service';
import { punchAttendance, getMemberAttendanceHistory, AttendanceRecord } from '../services/attendance.service';
import { listPayments, addPayment, deletePayment, Payment } from '../services/payment.service';
import { listMeasurements, deleteMeasurement, Measurement } from '../services/measurement.service';
import {
  listMemberDocuments,
  uploadMemberDocument,
  deleteMemberDocument,
  MemberDocument,
} from '../services/memberDocument.service';
import {
  listMemberPTPlans,
  assignMemberPTPlan,
  toggleFreezeMemberPTPlan,
  deleteMemberPTPlan,
  MemberPTPlan,
} from '../services/memberPtPlan.service';
import {
  listMemberWorkoutPlans,
  assignMemberWorkoutPlan,
  deleteMemberWorkoutPlan,
  MemberWorkoutPlan,
} from '../services/memberWorkoutPlan.service';
import {
  listMemberDietPlans,
  assignMemberDietPlan,
  deleteMemberDietPlan,
  MemberDietPlan,
} from '../services/memberDietPlan.service';
import { getGymServices, createGymService, deleteGymService, GymServiceRecord } from '../services/report.service';
import { listBatches, Batch } from '../services/batch.service';
import { listPTPlans, PTPlan } from '../services/ptPlan.service';
import { listWorkoutPlans, WorkoutPlan } from '../services/workoutPlan.service';
import { listDietPlans, DietPlan } from '../services/dietPlan.service';
import IdCardModal from '../components/IdCardModal';
import AddPaymentModal from '../components/AddPaymentModal';
import InvoicePreviewModal from '../components/InvoicePreviewModal';
import ShowHideSectionsModal, { SectionVisibility, DEFAULT_SECTION_VISIBILITY } from '../components/ShowHideSectionsModal';
import AssignPlanModal, { AssignPlanItem } from '../components/AssignPlanModal';
import OptionSheet, { SheetOption } from '../components/OptionSheet';
import AddMeasurementScreen from './AddMeasurementScreen';
import DateInputField from '../components/DateInputField';

interface Props {
  member: Member;
  onBack: () => void;
  onOpenRenewPlan: (member: Member) => void;
  onNavigateGymServices?: () => void;
  onNavigatePtPlans?: () => void;
  onNavigateBatches?: () => void;
  onNavigateWorkoutPlans?: () => void;
  onNavigateDietPlans?: () => void;
}

const formatINR = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const SECTION_VISIBILITY_KEY = 'memberDetail.sectionVisibility';

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default function MemberDetailScreen({ member: initialMember, onBack, onOpenRenewPlan, onNavigateGymServices, onNavigatePtPlans, onNavigateBatches, onNavigateWorkoutPlans, onNavigateDietPlans }: Props) {
  const insets = useSafeAreaInsets();
  const { isDark, palette } = useTheme();
  const { role, can, guard } = usePermissions();
  const isStaff = role === 'staff';
  const accent = isDark ? palette.accent : '#006666';

  const [member, setMember] = useState<Member>(initialMember);
  const [loading, setLoading] = useState(true);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [documents, setDocuments] = useState<MemberDocument[]>([]);
  const [memberPtPlans, setMemberPtPlans] = useState<MemberPTPlan[]>([]);
  const [memberWorkoutPlans, setMemberWorkoutPlans] = useState<MemberWorkoutPlan[]>([]);
  const [memberDietPlans, setMemberDietPlans] = useState<MemberDietPlan[]>([]);
  const [gymServices, setGymServices] = useState<GymServiceRecord[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [ptPlanCatalog, setPtPlanCatalog] = useState<PTPlan[]>([]);
  const [workoutPlanCatalog, setWorkoutPlanCatalog] = useState<WorkoutPlan[]>([]);
  const [dietPlanCatalog, setDietPlanCatalog] = useState<DietPlan[]>([]);

  const [sectionVisibility, setSectionVisibility] = useState<SectionVisibility>(DEFAULT_SECTION_VISIBILITY);

  // Modal / overlay state
  const [idCardVisible, setIdCardVisible] = useState(false);
  const [addPaymentVisible, setAddPaymentVisible] = useState(false);
  const [invoicePayment, setInvoicePayment] = useState<Payment | null>(null);
  const [showHideVisible, setShowHideVisible] = useState(false);
  const [batchPickerVisible, setBatchPickerVisible] = useState(false);
  const [assignPtVisible, setAssignPtVisible] = useState(false);
  const [assignWorkoutVisible, setAssignWorkoutVisible] = useState(false);
  const [assignDietVisible, setAssignDietVisible] = useState(false);
  const [addServiceVisible, setAddServiceVisible] = useState(false);
  const [addMeasurementVisible, setAddMeasurementVisible] = useState(false);
  const [allPlansVisible, setAllPlansVisible] = useState(false);
  const [attendanceMonth, setAttendanceMonth] = useState(new Date());
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);

  const [serviceName, setServiceName] = useState('');
  const [serviceAmount, setServiceAmount] = useState('');
  const [serviceDueAmount, setServiceDueAmount] = useState('');
  const [servicePaymentMethod, setServicePaymentMethod] = useState<'Cash' | 'Card' | 'UPI' | 'Bank Transfer' | 'Other'>('Cash');
  const [serviceDate, setServiceDate] = useState<Date>(new Date());

  // Detail view modals
  const [viewPtPlan, setViewPtPlan] = useState<MemberPTPlan | null>(null);
  const [viewWorkoutPlan, setViewWorkoutPlan] = useState<MemberWorkoutPlan | null>(null);
  const [viewDietPlan, setViewDietPlan] = useState<MemberDietPlan | null>(null);
  const [viewService, setViewService] = useState<GymServiceRecord | null>(null);
  const [photoViewVisible, setPhotoViewVisible] = useState(false);

  const refreshMember = () => {
    getMember(member._id).then(setMember).catch(() => {});
  };

  const handleUpdatePhoto = async () => {
    try {
      const ImagePicker = await import('expo-image-picker');
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow photo library access to update profile photo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const updated = await updateMemberPhoto(member._id, result.assets[0].uri);
      setMember(updated);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not update photo');
    }
  };

  useEffect(() => {
    AsyncStorage.getItem(SECTION_VISIBILITY_KEY).then((raw) => {
      if (raw) {
        try {
          setSectionVisibility({ ...DEFAULT_SECTION_VISIBILITY, ...JSON.parse(raw) });
        } catch {}
      }
    });

    Promise.all([
      getMember(initialMember._id),
      listPayments(initialMember._id).catch(() => []),
      listBatches().catch(() => []),
    ]).then(([m, p, b]) => {
      setMember(m);
      setPayments(p);
      setBatches(b);
      setLoading(false);
    }).catch(() => setLoading(false));

    if (can('members.edit')) {
      listMeasurements(initialMember._id).then(setMeasurements).catch(() => {});
      listMemberDocuments(initialMember._id).then(setDocuments).catch(() => {});
    }
    if (can('ptPlans.view')) {
      listMemberPTPlans(initialMember._id).then(setMemberPtPlans).catch(() => {});
      listPTPlans().then(setPtPlanCatalog).catch(() => {});
    }
    if (can('services.view')) {
      getGymServices({ memberId: initialMember._id }).then((res) => setGymServices(res.services)).catch(() => {});
    }
    // No permission group covers workout/diet plans - always fetched, same as admin.
    listMemberWorkoutPlans(initialMember._id).then(setMemberWorkoutPlans).catch(() => {});
    listMemberDietPlans(initialMember._id).then(setMemberDietPlans).catch(() => {});
    listWorkoutPlans().then(setWorkoutPlanCatalog).catch(() => {});
    listDietPlans().then(setDietPlanCatalog).catch(() => {});
    if (can('reports.attendance') || can('attendance.mark')) {
      getMemberAttendanceHistory(initialMember._id).then(setAttendanceHistory).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistVisibility = (next: SectionVisibility) => {
    setSectionVisibility(next);
    AsyncStorage.setItem(SECTION_VISIBILITY_KEY, JSON.stringify(next)).catch(() => {});
  };

  const plan = member.planId;
  const purchaseDate = plan && member.planExpiryDate ? addDays(new Date(member.planExpiryDate), -(plan.durationInDays || 0)) : new Date(member.joiningDate);

  const handlePunchAttendance = async () => {
    try {
      const res = await punchAttendance(member._id);
      Alert.alert('Attendance Updated', res.message);
      getMemberAttendanceHistory(member._id).then(setAttendanceHistory).catch(() => {});
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not record attendance');
    }
  };

  const handleToggleBlock = async () => {
    try {
      const updated = await toggleBlockMember(member._id);
      setMember((m) => ({ ...m, isBlocked: updated.isBlocked }));
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not update member');
    }
  };

  const handleToggleFreeze = async () => {
    try {
      const updated = await toggleFreezeMember(member._id);
      setMember((m) => ({ ...m, isFrozen: updated.isFrozen }));
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not update membership');
    }
  };

  const handleDeletePlan = () => {
    Alert.alert('Remove Plan', 'Clear this member\'s current plan assignment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            const updated = await clearMemberPlan(member._id);
            setMember(updated);
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Could not clear plan');
          }
        },
      },
    ]);
  };

  const handleAddPayment = async (input: { amount: number; method: string; date: string }) => {
    const res = await addPayment(member._id, input);
    setMember(res.member);
    setPayments((prev) => [res.payment, ...prev]);
  };

  const handleDeletePayment = (payment: Payment) => {
    Alert.alert('Delete Payment', `Remove payment of ${formatINR(payment.amount)}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await deletePayment(member._id, payment._id);
            setMember(res.member);
            setPayments((prev) => prev.filter((p) => p._id !== payment._id));
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Could not delete payment');
          }
        },
      },
    ]);
  };

  const handleAssignBatch = async (batchId: string) => {
    try {
      const updated = await assignMemberBatch(member._id, batchId);
      setMember(updated);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not assign batch');
    }
  };

  const handleAssignPT = async (ptPlanId: string) => {
    try {
      const assignment = await assignMemberPTPlan(member._id, { ptPlanId });
      setMemberPtPlans((prev) => [assignment, ...prev]);
      setAssignPtVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not assign PT plan');
    }
  };

  const handleFreezePT = async (assignmentId: string) => {
    try {
      const updated = await toggleFreezeMemberPTPlan(member._id, assignmentId);
      setMemberPtPlans((prev) => prev.map((p) => (p._id === assignmentId ? updated : p)));
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not update PT plan');
    }
  };

  const handleDeletePT = (assignmentId: string) => {
    Alert.alert('Remove PT Plan', 'Remove this PT plan from the member?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteMemberPTPlan(member._id, assignmentId);
          setMemberPtPlans((prev) => prev.filter((p) => p._id !== assignmentId));
        },
      },
    ]);
  };

  const handleAssignWorkout = async (planId: string) => {
    try {
      const assignment = await assignMemberWorkoutPlan(member._id, planId);
      setMemberWorkoutPlans((prev) => [assignment, ...prev]);
      setAssignWorkoutVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not assign workout plan');
    }
  };

  const handleDeleteWorkout = (assignmentId: string) => {
    Alert.alert('Remove Workout Plan', 'Remove this workout plan from the member?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteMemberWorkoutPlan(member._id, assignmentId);
          setMemberWorkoutPlans((prev) => prev.filter((p) => p._id !== assignmentId));
        },
      },
    ]);
  };

  const handleAssignDiet = async (planId: string) => {
    try {
      const assignment = await assignMemberDietPlan(member._id, planId);
      setMemberDietPlans((prev) => [assignment, ...prev]);
      setAssignDietVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not assign diet plan');
    }
  };

  const handleDeleteDiet = (assignmentId: string) => {
    Alert.alert('Remove Diet Plan', 'Remove this diet plan from the member?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteMemberDietPlan(member._id, assignmentId);
          setMemberDietPlans((prev) => prev.filter((p) => p._id !== assignmentId));
        },
      },
    ]);
  };

  const handleAddService = async () => {
    if (!serviceName.trim()) {
      Alert.alert('Required', 'Enter a service name.');
      return;
    }
    try {
      await createGymService({
        memberId: member._id,
        serviceName: serviceName.trim(),
        paidAmount: Number(serviceAmount) || 0,
        dueAmount: Number(serviceDueAmount) || 0,
        paymentMethod: servicePaymentMethod,
        date: `${serviceDate.getFullYear()}-${String(serviceDate.getMonth() + 1).padStart(2, '0')}-${String(serviceDate.getDate()).padStart(2, '0')}`,
      });
      setServiceName('');
      setServiceAmount('');
      setServiceDueAmount('');
      setServicePaymentMethod('Cash');
      setServiceDate(new Date());
      setAddServiceVisible(false);
      const res = await getGymServices({ memberId: member._id });
      setGymServices(res.services);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not add service');
    }
  };

  const handleDeleteService = (service: GymServiceRecord) => {
    Alert.alert('Remove Service', `Remove "${service.serviceName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteGymService(service._id);
          setGymServices((prev) => prev.filter((s) => s._id !== service._id));
        },
      },
    ]);
  };

  const handleUploadDocument = async () => {
    try {
      const ImagePicker = await import('expo-image-picker');
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow photo library access to upload a document.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
      if (result.canceled || !result.assets?.[0]) return;
      const doc = await uploadMemberDocument(member._id, result.assets[0].uri);
      setDocuments((prev) => [doc, ...prev]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not upload document');
    }
  };

  const handleDeleteDocument = (doc: MemberDocument) => {
    Alert.alert('Delete Document', `Remove "${doc.fileName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteMemberDocument(member._id, doc._id);
          setDocuments((prev) => prev.filter((d) => d._id !== doc._id));
        },
      },
    ]);
  };

  const handleDeleteMeasurement = (measurement: Measurement) => {
    Alert.alert('Delete Measurement', `Remove entry from ${formatDate(measurement.date)}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteMeasurement(member._id, measurement._id);
          setMeasurements((prev) => prev.filter((m) => m._id !== measurement._id));
        },
      },
    ]);
  };

  const handleShareWorkoutPlan = (assignment: MemberWorkoutPlan) => {
    const p = assignment.planId;
    const lines = p.days.map((d, i) => `Day ${i + 1} - ${d.title}: ${d.exercises.map((e) => e.name).join(', ')}`);
    Share.share({ message: `${p.name}\n${lines.join('\n')}` });
  };

  const actionRow: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }[] = [
    { icon: 'card-outline', label: 'ID Card', onPress: () => setIdCardVisible(true) },
    { icon: 'call-outline', label: 'Call', onPress: () => Linking.openURL(`tel:${member.mobile}`) },
    { icon: 'logo-whatsapp', label: 'Whatsapp', onPress: () => Linking.openURL(`https://wa.me/91${member.mobile}`) },
    { icon: 'finger-print-outline', label: 'Attendance', onPress: handlePunchAttendance },
    { icon: 'refresh-outline', label: 'Renew Plan', onPress: () => guard('memberships.edit', () => onOpenRenewPlan(member)) },
    { icon: 'ban-outline', label: member.isBlocked ? 'Unblock' : 'Block', onPress: handleToggleBlock },
  ];

  const batchOptions: SheetOption[] = batches.map((b) => ({ label: b.name, value: b._id }));
  const ptPlanItems: AssignPlanItem[] = ptPlanCatalog.map((p) => ({
    id: p._id,
    title: p.name,
    subtitle: formatINR(p.amount),
    detailLines: [`${p.durationValue} ${p.durationUnit}${p.isSessionBased ? ` • ${p.sessions} sessions` : ''}`],
  }));
  const workoutPlanItems: AssignPlanItem[] = workoutPlanCatalog.map((p) => ({
    id: p._id,
    title: p.name,
    detailLines: [`${p.days.length} days`],
  }));
  const dietPlanItems: AssignPlanItem[] = dietPlanCatalog.map((p) => ({
    id: p._id,
    title: p.name,
    detailLines: [`${p.days.length} days`],
  }));

  const monthLabel = attendanceMonth.toLocaleString('default', { month: 'short', year: 'numeric' });
  const monthRecords = attendanceHistory.filter((r) => {
    const d = new Date(r.dateStr);
    return d.getFullYear() === attendanceMonth.getFullYear() && d.getMonth() === attendanceMonth.getMonth();
  });

  // Personal show/hide preference (from the settings gear icon) - same for every role.
  const showSection = (key: keyof SectionVisibility) => sectionVisibility[key];
  // Whether THIS staff member lacks the permission this section's data requires.
  // Sections with no permission key (workout/diet plans) are never denied.
  const sectionDenied = (permKey: string | null) => isStaff && !!permKey && !can(permKey);

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: palette.background, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <StatusBar style="light" />

      <View style={[styles.topBar, { backgroundColor: palette.topBarBg }]}>
        <Pressable onPress={onBack} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={palette.topBarText} />
        </Pressable>
        <Text style={[styles.topTitle, { color: palette.topBarText }]}>Member Detail</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
        {/* Header card */}
        <View style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => setPhotoViewVisible(true)}
              style={styles.avatarWrap}
            >
              {member.photoUrl ? (
                <Image
                  source={{ uri: `getPhotoUri(member.photoUrl)!` }}
                  style={styles.avatarImg}
                />
              ) : (
                <View style={[styles.avatarImg, { backgroundColor: accent, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={styles.avatarText}>{member.name.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <Pressable
                onPress={() => setPhotoViewVisible(true)}
                style={styles.cameraOverlay}
                hitSlop={8}
              >
                <Ionicons name="camera" size={14} color="#FFFFFF" />
              </Pressable>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Name</Text>
              <Text style={[styles.valueBold, { color: palette.text }]}>{member.name}</Text>
            </View>
            {(member.isFrozen || member.isBlocked) && (
              <View style={{ gap: 4, alignItems: 'flex-end' }}>
                {member.isFrozen && (
                  <View style={[styles.badge, { backgroundColor: palette.statusExpiredBg }]}>
                    <Text style={[styles.badgeText, { color: palette.statusExpiredText }]}>Frozen</Text>
                  </View>
                )}
                {member.isBlocked && (
                  <View style={[styles.badge, { backgroundColor: palette.statusExpiredBg }]}>
                    <Text style={[styles.badgeText, { color: palette.statusExpiredText }]}>Blocked</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={styles.detailGrid}>
            <View style={styles.detailCol}>
              <Text style={[styles.labelSmall, { color: palette.textMuted }]}>M ID</Text>
              <Text style={[styles.value, { color: palette.text }]}>{member.membershipId}</Text>
            </View>
            <View style={[styles.detailCol, { alignItems: 'flex-end' }]}>
              <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Mobile</Text>
              <Text style={[styles.value, { color: palette.text }]}>+{member.countryCode}-{member.mobile}</Text>
            </View>
            <View style={styles.detailCol}>
              <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Gender</Text>
              <Text style={[styles.value, { color: palette.text }]}>{member.gender === 'male' ? 'Male' : 'Female'}</Text>
            </View>
            <View style={[styles.detailCol, { alignItems: 'flex-end' }]}>
              <Text style={[styles.labelSmall, { color: palette.textMuted }]}>DOB</Text>
              <Text style={[styles.value, { color: palette.text }]}>{member.dob ? formatDate(member.dob) : '-'}</Text>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14 }} contentContainerStyle={{ gap: 4 }}>
            {actionRow.map((a) => (
              <Pressable key={a.label} style={styles.actionBtn} onPress={a.onPress}>
                <Ionicons name={a.icon} size={19} color={palette.textMuted} />
                <Text style={[styles.actionLabel, { color: palette.textFaint }]}>{a.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Plans */}
        <View style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionHeaderText, { color: palette.text }]}>Plans</Text>
            <Pressable
              hitSlop={8}
              onPress={() => guard('memberships.view', () => setAllPlansVisible(true))}
            >
              <Text style={{ color: accent, fontWeight: '700', fontSize: 12.5 }}>View All ({plan ? 1 : 0})</Text>
            </Pressable>
          </View>

          {sectionDenied('memberships.view') ? (
            <AccessDenied palette={palette} message="You don't have permission to view plans." />
          ) : (
          <>
            {plan ? (
              <>
                <View style={styles.planNameRow}>
                  <View>
                    <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Plan Name</Text>
                    <Text style={[styles.valueBold, { color: palette.text }]}>{plan.name}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 14 }}>
                    <Pressable onPress={() => guard('memberships.edit', () => onOpenRenewPlan(member))} hitSlop={8}>
                      <Ionicons name="create-outline" size={20} color={accent} />
                    </Pressable>
                    <Pressable onPress={() => guard('memberships.delete', handleDeletePlan)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={20} color={palette.textMuted} />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.detailGrid}>
                  <View style={styles.detailCol}>
                    <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Purchase Date</Text>
                    <Text style={[styles.value, { color: palette.text }]}>{formatDate(purchaseDate)}</Text>
                  </View>
                  <View style={[styles.detailCol, { alignItems: 'flex-end' }]}>
                    <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Expiry Date</Text>
                    <Text style={[styles.value, { color: palette.text }]}>{member.planExpiryDate ? formatDate(member.planExpiryDate) : '-'}</Text>
                  </View>
                  <View style={styles.detailCol}>
                    <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Complete Amount</Text>
                    <Text style={[styles.value, { color: palette.text }]}>{formatINR(member.planAmount)}</Text>
                  </View>
                  <View style={[styles.detailCol, { alignItems: 'flex-end' }]}>
                    <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Discount</Text>
                    <Text style={[styles.value, { color: palette.text }]}>
                      {member.discountType === 'percent' ? `${member.discountValue}%` : formatINR(member.discountValue)}
                    </Text>
                  </View>
                  <View style={styles.detailCol}>
                    <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Paid</Text>
                    <Text style={[styles.value, { color: palette.statusActiveText }]}>{formatINR(member.paidAmount)}</Text>
                  </View>
                  <View style={[styles.detailCol, { alignItems: 'flex-end' }]}>
                    <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Due Amount</Text>
                    <Text style={[styles.value, { color: member.dueAmount > 0 ? palette.statusExpiredText : palette.text }]}>
                      {formatINR(member.dueAmount)}
                    </Text>
                  </View>
                </View>

                {/* Payment Details */}
                <View style={[styles.divider, { backgroundColor: palette.cardBorder }]} />
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionHeaderText, { color: palette.text, fontSize: 14 }]}>Payment Details</Text>
                  {member.dueAmount > 0 && (
                    <Pressable
                      style={[styles.smallBtn, { backgroundColor: accent }]}
                      onPress={() => guard('memberships.edit', () => setAddPaymentVisible(true))}
                    >
                      <Ionicons name="card-outline" size={14} color="#FFFFFF" />
                      <Text style={styles.smallBtnText}>Add Payment</Text>
                    </Pressable>
                  )}
                </View>

                {payments.map((p) => (
                  <View key={p._id} style={styles.paymentRow}>
                    <View>
                      <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Date</Text>
                      <Text style={[styles.value, { color: palette.text }]}>{formatDate(p.date)}</Text>
                    </View>
                    <Text style={[styles.value, { color: palette.text }]}>{formatINR(p.amount)} ({p.method})</Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <Pressable onPress={() => guard('memberships.delete', () => handleDeletePayment(p))} hitSlop={8}>
                        <Ionicons name="trash-outline" size={17} color={palette.textMuted} />
                      </Pressable>
                      <Pressable onPress={() => setInvoicePayment(p)} hitSlop={8}>
                        <Ionicons name="share-social-outline" size={17} color={accent} />
                      </Pressable>
                    </View>
                  </View>
                ))}

                <View style={styles.linkRow}>
                  {payments.length > 0 && (
                    <Pressable onPress={() => setInvoicePayment(payments[0])} style={styles.linkBtn}>
                      <Ionicons name="arrow-redo-outline" size={14} color={accent} />
                      <Text style={[styles.linkText, { color: accent }]}>Share Invoice</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => guard('memberships.freeze', handleToggleFreeze)} style={styles.linkBtn}>
                    <Ionicons name="snow-outline" size={14} color={accent} />
                    <Text style={[styles.linkText, { color: accent }]}>{member.isFrozen ? 'Unfreeze Membership' : 'Freeze Membership'}</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <Text style={{ color: palette.textMuted }}>No active plan</Text>
                <Pressable style={[styles.smallBtn, { backgroundColor: accent, marginTop: 10 }]} onPress={() => guard('memberships.edit', () => onOpenRenewPlan(member))}>
                  <Text style={styles.smallBtnText}>Assign Plan</Text>
                </Pressable>
              </View>
            )}
          </>
          )}
        </View>

        {/* Tab pill row */}
        <View style={styles.pillRowWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {[
              { key: 'batch', label: 'Batch', has: !!member.batchLabel && member.batchLabel !== 'No Batch Found' },
              { key: 'ptPlans', label: 'PT Plans', has: memberPtPlans.length > 0 },
              { key: 'services', label: 'Services', has: gymServices.length > 0 },
              { key: 'workoutPlans', label: 'Workout Plans', has: memberWorkoutPlans.length > 0 },
              { key: 'dietPlans', label: 'Diet Plans', has: memberDietPlans.length > 0 },
              { key: 'measurement', label: 'Measurement', has: measurements.length > 0 },
              { key: 'attendance', label: 'Attendance', has: attendanceHistory.length > 0 },
              { key: 'documents', label: 'Documents', has: documents.length > 0 },
            ].map((pill) => (
              <View
                key={pill.key}
                style={[
                  styles.pill,
                  { borderColor: pill.has ? accent : palette.cardBorder, backgroundColor: pill.has ? (isDark ? 'rgba(255,255,255,0.06)' : '#EEF7F7') : palette.cardBg },
                ]}
              >
                {pill.has && <Ionicons name="checkmark" size={13} color={accent} />}
                <Text style={{ color: pill.has ? accent : palette.textMuted, fontSize: 12, fontWeight: '700' }}>{pill.label}</Text>
              </View>
            ))}
          </ScrollView>
          <Pressable onPress={() => setShowHideVisible(true)} hitSlop={8} style={{ marginLeft: 8 }}>
            <Ionicons name="settings-outline" size={20} color={palette.textMuted} />
          </Pressable>
        </View>

        {/* Batch */}
        {showSection('batch') && (
          <SectionCard
            title="Batch"
            palette={palette}
            accent={accent}
            actionLabel="Add Batch"
            onAction={() => guard('memberships.edit', () => {
              if (batches.length === 0 && onNavigateBatches) {
                onNavigateBatches();
              } else {
                setBatchPickerVisible(true);
              }
            })}
          >
            {sectionDenied('memberships.edit') ? (
              <AccessDenied palette={palette} message="You don't have permission to view the batch." />
            ) : (
              <Text style={{ color: palette.text, fontWeight: '600' }}>{member.batchLabel || 'No Batch Found'}</Text>
            )}
          </SectionCard>
        )}

        {/* PT Plans */}
        {showSection('ptPlans') && (
          <SectionCard
            title="PT Plans"
            palette={palette}
            accent={accent}
            countLabel={memberPtPlans.length > 0 ? `View All (${memberPtPlans.length})` : undefined}
            onCountPress={() => setAssignPtVisible(true)}
            actionLabel="Assign PT Plan"
            onAction={() => guard('ptPlans.add', () => {
              if (ptPlanCatalog.length === 0 && onNavigatePtPlans) {
                onNavigatePtPlans();
              } else {
                setAssignPtVisible(true);
              }
            })}
          >
            {sectionDenied('ptPlans.view') ? (
              <AccessDenied palette={palette} message="You don't have permission to view PT plans." />
            ) : (
              memberPtPlans.map((p) => (
                <Pressable key={p._id} style={styles.assignedRow} onPress={() => setViewPtPlan(p)}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: palette.text, fontWeight: '700' }}>{p.ptPlanId?.name}</Text>
                    <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                      {formatDate(p.startDate)} - {formatDate(p.expiryDate)} {p.isFrozen ? '(Frozen)' : ''}
                    </Text>
                  </View>
                  <Pressable onPress={() => guard('ptPlans.freeze', () => handleFreezePT(p._id))} hitSlop={8} style={{ marginRight: 12 }}>
                    <Ionicons name="snow-outline" size={18} color={p.isFrozen ? accent : palette.textMuted} />
                  </Pressable>
                  <Pressable onPress={() => guard('ptPlans.delete', () => handleDeletePT(p._id))} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={palette.textMuted} />
                  </Pressable>
                </Pressable>
              ))
            )}
          </SectionCard>
        )}

        {/* Services */}
        {showSection('services') && (
          <SectionCard
            title="Services"
            palette={palette}
            accent={accent}
            countLabel={gymServices.length > 0 ? `View All (${gymServices.length})` : undefined}
            onCountPress={() => setAddServiceVisible(true)}
            actionLabel="Add Service"
            onAction={() => guard('services.add', () => {
              if (gymServices.length === 0 && onNavigateGymServices) {
                onNavigateGymServices();
              } else {
                setAddServiceVisible(true);
              }
            })}
          >
            {sectionDenied('services.view') ? (
              <AccessDenied palette={palette} message="You don't have permission to view services." />
            ) : gymServices.length === 0 ? null : (
              gymServices.map((s) => (
                <Pressable key={s._id} style={styles.assignedRow} onPress={() => setViewService(s)}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: palette.text, fontWeight: '700' }}>{s.serviceName}</Text>
                    <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                      {formatDate(s.date)} • Paid {formatINR(s.paidAmount)}{s.dueAmount > 0 ? ` • Due ${formatINR(s.dueAmount)}` : ''}
                    </Text>
                  </View>
                  <Pressable onPress={() => guard('services.delete', () => handleDeleteService(s))} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={palette.textMuted} />
                  </Pressable>
                </Pressable>
              ))
            )}
          </SectionCard>
        )}

        {/* Workout Plans - no permission group; always usable */}
        {showSection('workoutPlans') && (
          <SectionCard
            title="Workout Plans"
            palette={palette}
            accent={accent}
            countLabel={memberWorkoutPlans.length > 0 ? `View All (${memberWorkoutPlans.length})` : undefined}
            onCountPress={() => setAssignWorkoutVisible(true)}
            actionLabel="Add Workout"
            onAction={() => {
              if (workoutPlanCatalog.length === 0 && onNavigateWorkoutPlans) {
                onNavigateWorkoutPlans();
              } else {
                setAssignWorkoutVisible(true);
              }
            }}
          >
            {memberWorkoutPlans.length === 0 ? null : (
              memberWorkoutPlans.map((assignment) => (
                <Pressable key={assignment._id} style={{ marginBottom: 10 }} onPress={() => setViewWorkoutPlan(assignment)}>
                  <View style={styles.assignedRow}>
                    <Text style={{ color: palette.text, fontWeight: '700', flex: 1 }}>{assignment.planId.name}</Text>
                    <Pressable onPress={() => handleDeleteWorkout(assignment._id)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={18} color={palette.textMuted} />
                    </Pressable>
                  </View>
                  <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                    {assignment.planId.days.length} days · {assignment.planId.days.reduce((s, d) => s + d.exercises.length, 0)} exercises
                  </Text>
                  {assignment.planId.days[0] && (
                    <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 2 }}>
                      Day 1{assignment.planId.days[0].exercises[0] ? ` - ${assignment.planId.days[0].exercises[0].name}` : ''}
                    </Text>
                  )}
                  <Pressable onPress={() => handleShareWorkoutPlan(assignment)} style={{ marginTop: 6 }}>
                    <Text style={{ color: accent, fontWeight: '700', fontSize: 12 }}>Share Workout Plan</Text>
                  </Pressable>
                </Pressable>
              ))
            )}
          </SectionCard>
        )}

        {/* Diet Plans - no permission group; always usable */}
        {showSection('dietPlans') && (
          <SectionCard
            title="Diet Plans"
            palette={palette}
            accent={accent}
            countLabel={memberDietPlans.length > 0 ? `View All (${memberDietPlans.length})` : undefined}
            onCountPress={() => setAssignDietVisible(true)}
            actionLabel="Add Diet Plan"
            onAction={() => {
              if (dietPlanCatalog.length === 0 && onNavigateDietPlans) {
                onNavigateDietPlans();
              } else {
                setAssignDietVisible(true);
              }
            }}
          >
            {memberDietPlans.length === 0 ? null : (
              memberDietPlans.map((assignment) => (
                <Pressable key={assignment._id} style={styles.assignedRow} onPress={() => setViewDietPlan(assignment)}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: palette.text, fontWeight: '700' }}>{assignment.planId.name}</Text>
                    <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                      {assignment.planId.days.length} days · Assigned {formatDate(assignment.assignedDate)}
                    </Text>
                  </View>
                  <Pressable onPress={() => handleDeleteDiet(assignment._id)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={palette.textMuted} />
                  </Pressable>
                </Pressable>
              ))
            )}
          </SectionCard>
        )}

        {/* Measurement */}
        {showSection('measurement') && (
          <SectionCard title="Measurement" palette={palette} accent={accent} actionLabel="Add Measurement" onAction={() => guard('members.edit', () => setAddMeasurementVisible(true))}>
            {sectionDenied('members.edit') ? (
              <AccessDenied palette={palette} message="You don't have permission to view measurements." />
            ) : (
              measurements.map((m) => (
                <View key={m._id} style={styles.assignedRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: palette.text, fontWeight: '700' }}>{formatDate(m.date)}</Text>
                    <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                      {m.weight != null ? `Weight: ${m.weight}kg  ` : ''}{m.height != null ? `Height: ${m.height}cm` : ''}
                    </Text>
                  </View>
                  <Pressable onPress={() => guard('members.edit', () => handleDeleteMeasurement(m))} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={palette.textMuted} />
                  </Pressable>
                </View>
              ))
            )}
          </SectionCard>
        )}

        {/* Attendance */}
        {showSection('attendance') && (
          <View style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="time-outline" size={16} color={accent} />
              <Text style={[styles.sectionHeaderText, { color: palette.text, marginLeft: 6, flex: 1 }]}>Attendance</Text>
            </View>
            {sectionDenied('reports.attendance') ? (
              <AccessDenied palette={palette} message="You don't have permission to view attendance." />
            ) : (
              <>
                <View style={styles.monthNavRow}>
                  <Pressable onPress={() => setAttendanceMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))} hitSlop={8}>
                    <Ionicons name="chevron-back" size={20} color={accent} />
                  </Pressable>
                  <Text style={{ color: palette.text, fontWeight: '800' }}>{monthLabel}</Text>
                  <Pressable onPress={() => setAttendanceMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))} hitSlop={8}>
                    <Ionicons name="chevron-forward" size={20} color={accent} />
                  </Pressable>
                </View>
                {monthRecords.length === 0 ? (
                  <Text style={{ color: palette.textMuted, textAlign: 'center', paddingVertical: 16 }}>No attendance records this month.</Text>
                ) : (
                  monthRecords.map((r) => (
                    <View key={r._id} style={styles.attendanceRow}>
                      <Text style={{ color: palette.text, fontWeight: '600' }}>{formatDate(r.dateStr)}</Text>
                      <View style={{ flexDirection: 'row', gap: 14 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="log-in-outline" size={14} color={palette.statusActiveText} />
                          <Text style={{ color: palette.textMuted, fontSize: 12 }}>{new Date(r.punchInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="log-out-outline" size={14} color="#F59E0B" />
                          <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                            {r.punchOutTime ? new Date(r.punchOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </>
            )}
          </View>
        )}

        {/* Documents */}
        {showSection('documents') && (
          <SectionCard title="Documents" palette={palette} accent={accent} actionLabel="Upload Document" onAction={() => guard('members.edit', handleUploadDocument)}>
            {sectionDenied('members.edit') ? (
              <AccessDenied palette={palette} message="You don't have permission to view documents." />
            ) : (
              documents.map((doc) => (
                <View key={doc._id} style={styles.assignedRow}>
                  <Image source={{ uri: getPhotoUri(doc.fileUrl) ?? doc.fileUrl }} style={{ width: 40, height: 40, borderRadius: 8, marginRight: 10 }} />
                  <Text style={{ color: palette.text, flex: 1 }} numberOfLines={1}>{doc.fileName}</Text>
                  <Pressable onPress={() => guard('members.edit', () => handleDeleteDocument(doc))} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={palette.textMuted} />
                  </Pressable>
                </View>
              ))
            )}
          </SectionCard>
        )}
      </ScrollView>

      <IdCardModal member={member} visible={idCardVisible} onClose={() => setIdCardVisible(false)} />

      <AddPaymentModal
        visible={addPaymentVisible}
        dueAmount={member.dueAmount}
        onClose={() => setAddPaymentVisible(false)}
        onSubmit={handleAddPayment}
      />

      {invoicePayment && (
        <InvoicePreviewModal
          visible={!!invoicePayment}
          member={member}
          payment={invoicePayment}
          allPayments={payments}
          onClose={() => setInvoicePayment(null)}
        />
      )}

      <ShowHideSectionsModal
        visible={showHideVisible}
        value={sectionVisibility}
        onChange={persistVisibility}
        onClose={() => setShowHideVisible(false)}
      />

      <OptionSheet
        visible={batchPickerVisible}
        title="Select Batch"
        options={batchOptions}
        onSelect={handleAssignBatch}
        onClose={() => setBatchPickerVisible(false)}
      />

      <AssignPlanModal
        visible={assignPtVisible}
        title="Assign a PT Plan"
        subtitle={`Choose a plan to assign to ${member.name}`}
        items={ptPlanItems}
        emptyText="No PT plans in the catalog yet."
        onSelect={handleAssignPT}
        onClose={() => setAssignPtVisible(false)}
      />

      <AssignPlanModal
        visible={assignWorkoutVisible}
        title="Assign a Workout Plan"
        subtitle={`Choose a plan to assign to ${member.name}`}
        items={workoutPlanItems}
        emptyText="No workout plans in the catalog yet."
        onSelect={handleAssignWorkout}
        onClose={() => setAssignWorkoutVisible(false)}
      />

      <AssignPlanModal
        visible={assignDietVisible}
        title="Assign a Diet Plan"
        subtitle={`Choose a plan to assign to ${member.name}`}
        items={dietPlanItems}
        emptyText="No diet plans in the catalog yet."
        onSelect={handleAssignDiet}
        onClose={() => setAssignDietVisible(false)}
      />

      <Modal visible={addServiceVisible} transparent animationType="fade" onRequestClose={() => setAddServiceVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setAddServiceVisible(false)} />
          <View style={[styles.modalCard, { backgroundColor: palette.sheetBg, borderColor: palette.surfaceBorder }]}>
            <Text style={[styles.modalTitle, { color: palette.text }]}>Add Service</Text>

            {/* Service Name */}
            <Text style={[styles.modalLabel, { color: palette.textMuted }]}>Service Name *</Text>
            <View style={[styles.inputWrap, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder }]}>
              <TextInput
                style={[styles.input, { color: palette.text }]}
                placeholder="e.g. Locker, Steam Bath, Diet"
                placeholderTextColor={palette.textFaint}
                value={serviceName}
                onChangeText={setServiceName}
              />
            </View>

            {/* Paid & Due Amounts */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalLabel, { color: palette.textMuted }]}>Paid Amount (₹)</Text>
                <View style={[styles.inputWrap, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder }]}>
                  <TextInput
                    style={[styles.input, { color: palette.text }]}
                    placeholder="0"
                    placeholderTextColor={palette.textFaint}
                    keyboardType="numeric"
                    value={serviceAmount}
                    onChangeText={setServiceAmount}
                  />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalLabel, { color: palette.textMuted }]}>Due Amount (₹)</Text>
                <View style={[styles.inputWrap, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder }]}>
                  <TextInput
                    style={[styles.input, { color: palette.text }]}
                    placeholder="0"
                    placeholderTextColor={palette.textFaint}
                    keyboardType="numeric"
                    value={serviceDueAmount}
                    onChangeText={setServiceDueAmount}
                  />
                </View>
              </View>
            </View>

            {/* Payment Method */}
            <Text style={[styles.modalLabel, { color: palette.textMuted, marginTop: 12 }]}>Payment Method</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['Cash', 'UPI', 'Card', 'Bank Transfer', 'Other'] as const).map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => setServicePaymentMethod(m)}
                    style={[
                      styles.methodPill,
                      { borderColor: servicePaymentMethod === m ? accent : palette.inputBorder,
                        backgroundColor: servicePaymentMethod === m ? accent : palette.inputBg }
                    ]}
                  >
                    <Text style={{ color: servicePaymentMethod === m ? '#FFF' : palette.text, fontWeight: '700', fontSize: 12 }}>{m}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* Date */}
            <Text style={[styles.modalLabel, { color: palette.textMuted, marginTop: 12 }]}>Date</Text>
            <DateInputField
              icon="calendar-outline"
              placeholder="Service Date"
              value={serviceDate}
              onChange={(d) => setServiceDate(d)}
            />

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <Pressable
                style={[styles.smallBtn, { flex: 1, justifyContent: 'center', backgroundColor: palette.inputBg, borderColor: palette.inputBorder, borderWidth: 1 }]}
                onPress={() => { setAddServiceVisible(false); setServiceName(''); setServiceAmount(''); setServiceDueAmount(''); }}
              >
                <Text style={{ color: palette.text, fontWeight: '700' }}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.smallBtn, { flex: 1, justifyContent: 'center', backgroundColor: accent }]} onPress={handleAddService}>
                <Text style={styles.smallBtnText}>Add Service</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={addMeasurementVisible} animationType="slide" onRequestClose={() => setAddMeasurementVisible(false)}>
        <AddMeasurementScreen
          memberId={member._id}
          onBack={() => setAddMeasurementVisible(false)}
          onSaved={() => {
            setAddMeasurementVisible(false);
            listMeasurements(member._id).then(setMeasurements).catch(() => {});
          }}
        />
      </Modal>

      {/* ── PT Plan Detail Modal ── */}
      <Modal visible={!!viewPtPlan} transparent animationType="fade" onRequestClose={() => setViewPtPlan(null)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setViewPtPlan(null)} />
          {viewPtPlan && (
            <View style={[styles.modalCard, { backgroundColor: palette.sheetBg, borderColor: palette.surfaceBorder }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <Text style={[styles.modalTitle, { color: palette.text, marginBottom: 0 }]}>PT Plan Details</Text>
                <Pressable onPress={() => setViewPtPlan(null)} hitSlop={10}>
                  <Ionicons name="close" size={22} color={palette.textMuted} />
                </Pressable>
              </View>
              <Text style={[styles.detailModalName, { color: accent }]}>{viewPtPlan.ptPlanId?.name}</Text>
              <View style={styles.detailModalGrid}>
                <View style={styles.detailModalCell}>
                  <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Start Date</Text>
                  <Text style={[styles.value, { color: palette.text }]}>{formatDate(viewPtPlan.startDate)}</Text>
                </View>
                <View style={[styles.detailModalCell, { alignItems: 'flex-end' }]}>
                  <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Expiry Date</Text>
                  <Text style={[styles.value, { color: palette.text }]}>{formatDate(viewPtPlan.expiryDate)}</Text>
                </View>
                <View style={styles.detailModalCell}>
                  <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Amount</Text>
                  <Text style={[styles.value, { color: palette.text }]}>{formatINR(viewPtPlan.ptPlanId?.amount ?? 0)}</Text>
                </View>
                <View style={[styles.detailModalCell, { alignItems: 'flex-end' }]}>
                  <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Status</Text>
                  <Text style={[styles.value, { color: viewPtPlan.isFrozen ? palette.statusExpiredText : palette.statusActiveText }]}>
                    {viewPtPlan.isFrozen ? 'Frozen' : new Date(viewPtPlan.expiryDate) < new Date() ? 'Expired' : 'Active'}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <Pressable
                  style={[styles.smallBtn, { flex: 1, justifyContent: 'center', backgroundColor: palette.inputBg, borderColor: palette.inputBorder, borderWidth: 1 }]}
                  onPress={() => guard('ptPlans.freeze', () => { handleFreezePT(viewPtPlan._id); setViewPtPlan(null); })}
                >
                  <Ionicons name="snow-outline" size={15} color={palette.text} />
                  <Text style={{ color: palette.text, fontWeight: '700', marginLeft: 4 }}>{viewPtPlan.isFrozen ? 'Unfreeze' : 'Freeze'}</Text>
                </Pressable>
                <Pressable
                  style={[styles.smallBtn, { flex: 1, justifyContent: 'center', backgroundColor: '#EF4444' }]}
                  onPress={() => guard('ptPlans.delete', () => { setViewPtPlan(null); handleDeletePT(viewPtPlan._id); })}
                >
                  <Ionicons name="trash-outline" size={15} color="#FFF" />
                  <Text style={styles.smallBtnText}>Remove</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* ── Workout Plan Detail Modal ── */}
      <Modal visible={!!viewWorkoutPlan} transparent animationType="fade" onRequestClose={() => setViewWorkoutPlan(null)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setViewWorkoutPlan(null)} />
          {viewWorkoutPlan && (
            <View style={[styles.modalCard, { backgroundColor: palette.sheetBg, borderColor: palette.surfaceBorder, maxHeight: '80%' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <Text style={[styles.modalTitle, { color: palette.text, marginBottom: 0 }]}>Workout Plan</Text>
                <Pressable onPress={() => setViewWorkoutPlan(null)} hitSlop={10}>
                  <Ionicons name="close" size={22} color={palette.textMuted} />
                </Pressable>
              </View>
              <Text style={[styles.detailModalName, { color: accent }]}>{viewWorkoutPlan.planId.name}</Text>
              <Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 10 }}>
                {viewWorkoutPlan.planId.days.length} days · {viewWorkoutPlan.planId.days.reduce((s, d) => s + d.exercises.length, 0)} total exercises
              </Text>
              <ScrollView style={{ maxHeight: 280 }}>
                {viewWorkoutPlan.planId.days.map((day, i) => (
                  <View key={i} style={{ marginBottom: 12 }}>
                    <Text style={{ color: palette.text, fontWeight: '800', fontSize: 13, marginBottom: 4 }}>{day.title || `Day ${i + 1}`}</Text>
                    {day.exercises.map((ex, j) => (
                      <View key={j} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderTopWidth: 1, borderTopColor: palette.cardBorder }}>
                        <Text style={{ color: palette.text, fontSize: 12, flex: 1 }}>{ex.name}</Text>
                        <Text style={{ color: palette.textMuted, fontSize: 12 }}>{ex.sets}×{ex.reps}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </ScrollView>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <Pressable
                  style={[styles.smallBtn, { flex: 1, justifyContent: 'center', backgroundColor: accent }]}
                  onPress={() => { handleShareWorkoutPlan(viewWorkoutPlan); }}
                >
                  <Ionicons name="share-social-outline" size={15} color="#FFF" />
                  <Text style={styles.smallBtnText}>Share</Text>
                </Pressable>
                <Pressable
                  style={[styles.smallBtn, { flex: 1, justifyContent: 'center', backgroundColor: '#EF4444' }]}
                  onPress={() => { setViewWorkoutPlan(null); handleDeleteWorkout(viewWorkoutPlan._id); }}
                >
                  <Ionicons name="trash-outline" size={15} color="#FFF" />
                  <Text style={styles.smallBtnText}>Remove</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* ── Diet Plan Detail Modal ── */}
      <Modal visible={!!viewDietPlan} transparent animationType="fade" onRequestClose={() => setViewDietPlan(null)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setViewDietPlan(null)} />
          {viewDietPlan && (
            <View style={[styles.modalCard, { backgroundColor: palette.sheetBg, borderColor: palette.surfaceBorder, maxHeight: '80%' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <Text style={[styles.modalTitle, { color: palette.text, marginBottom: 0 }]}>Diet Plan</Text>
                <Pressable onPress={() => setViewDietPlan(null)} hitSlop={10}>
                  <Ionicons name="close" size={22} color={palette.textMuted} />
                </Pressable>
              </View>
              <Text style={[styles.detailModalName, { color: accent }]}>{viewDietPlan.planId.name}</Text>
              <Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 10 }}>
                {viewDietPlan.planId.days.length} days · Assigned {formatDate(viewDietPlan.assignedDate)}
              </Text>
              <ScrollView style={{ maxHeight: 280 }}>
                {viewDietPlan.planId.days.map((day, i) => (
                  <View key={i} style={{ marginBottom: 12 }}>
                    <Text style={{ color: palette.text, fontWeight: '800', fontSize: 13, marginBottom: 4 }}>{day.title || `Day ${i + 1}`}</Text>
                    {day.meals.map((meal, j) => (
                      <View key={j} style={{ paddingVertical: 4, borderTopWidth: 1, borderTopColor: palette.cardBorder }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ color: palette.text, fontSize: 12, fontWeight: '700' }}>{meal.name}</Text>
                          <Text style={{ color: palette.textMuted, fontSize: 12 }}>{meal.calories} kcal</Text>
                        </View>
                        {meal.quantity ? <Text style={{ color: palette.textMuted, fontSize: 11 }}>{meal.quantity}</Text> : null}
                      </View>
                    ))}
                  </View>
                ))}
              </ScrollView>
              <Pressable
                style={[styles.smallBtn, { justifyContent: 'center', backgroundColor: '#EF4444', marginTop: 14 }]}
                onPress={() => { setViewDietPlan(null); handleDeleteDiet(viewDietPlan._id); }}
              >
                <Ionicons name="trash-outline" size={15} color="#FFF" />
                <Text style={styles.smallBtnText}>Remove Diet Plan</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Modal>

      {/* ── Service Detail Modal ── */}
      <Modal visible={!!viewService} transparent animationType="fade" onRequestClose={() => setViewService(null)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setViewService(null)} />
          {viewService && (
            <View style={[styles.modalCard, { backgroundColor: palette.sheetBg, borderColor: palette.surfaceBorder }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <Text style={[styles.modalTitle, { color: palette.text, marginBottom: 0 }]}>Service Details</Text>
                <Pressable onPress={() => setViewService(null)} hitSlop={10}>
                  <Ionicons name="close" size={22} color={palette.textMuted} />
                </Pressable>
              </View>
              <Text style={[styles.detailModalName, { color: accent }]}>{viewService.serviceName}</Text>
              <View style={styles.detailModalGrid}>
                <View style={styles.detailModalCell}>
                  <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Date</Text>
                  <Text style={[styles.value, { color: palette.text }]}>{formatDate(viewService.date)}</Text>
                </View>
                <View style={[styles.detailModalCell, { alignItems: 'flex-end' }]}>
                  <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Payment Method</Text>
                  <Text style={[styles.value, { color: palette.text }]}>{viewService.paymentMethod || '-'}</Text>
                </View>
                <View style={styles.detailModalCell}>
                  <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Paid Amount</Text>
                  <Text style={[styles.value, { color: palette.statusActiveText }]}>{formatINR(viewService.paidAmount)}</Text>
                </View>
                <View style={[styles.detailModalCell, { alignItems: 'flex-end' }]}>
                  <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Due Amount</Text>
                  <Text style={[styles.value, { color: viewService.dueAmount > 0 ? palette.statusExpiredText : palette.text }]}>
                    {formatINR(viewService.dueAmount)}
                  </Text>
                </View>
              </View>
              <Pressable
                style={[styles.smallBtn, { justifyContent: 'center', backgroundColor: '#EF4444', marginTop: 16 }]}
                onPress={() => guard('services.delete', () => { setViewService(null); handleDeleteService(viewService); })}
              >
                <Ionicons name="trash-outline" size={15} color="#FFF" />
                <Text style={styles.smallBtnText}>Delete Service</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Modal>

      {/* ── All Plans Modal ── */}
      <Modal visible={allPlansVisible} transparent animationType="fade" onRequestClose={() => setAllPlansVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setAllPlansVisible(false)} />
          <View style={[styles.modalCard, { backgroundColor: palette.sheetBg, borderColor: palette.surfaceBorder, maxHeight: '80%' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <Text style={[styles.modalTitle, { color: palette.text, marginBottom: 0 }]}>All Plans</Text>
              <Pressable onPress={() => setAllPlansVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={palette.textMuted} />
              </Pressable>
            </View>

            {plan ? (
              <ScrollView style={{ maxHeight: 420 }}>
                <View style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder, marginBottom: 0 }]}>
                  <View style={styles.planNameRow}>
                    <View>
                      <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Plan Name</Text>
                      <Text style={[styles.valueBold, { color: palette.text }]}>{plan.name}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 14 }}>
                      <Pressable
                        onPress={() => guard('memberships.edit', () => { setAllPlansVisible(false); onOpenRenewPlan(member); })}
                        hitSlop={8}
                      >
                        <Ionicons name="create-outline" size={20} color={accent} />
                      </Pressable>
                      <Pressable
                        onPress={() => guard('memberships.delete', () => { setAllPlansVisible(false); handleDeletePlan(); })}
                        hitSlop={8}
                      >
                        <Ionicons name="trash-outline" size={20} color={palette.textMuted} />
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.detailGrid}>
                    <View style={styles.detailCol}>
                      <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Purchase Date</Text>
                      <Text style={[styles.value, { color: palette.text }]}>{formatDate(purchaseDate)}</Text>
                    </View>
                    <View style={[styles.detailCol, { alignItems: 'flex-end' }]}>
                      <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Expiry Date</Text>
                      <Text style={[styles.value, { color: palette.text }]}>{member.planExpiryDate ? formatDate(member.planExpiryDate) : '-'}</Text>
                    </View>
                    <View style={styles.detailCol}>
                      <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Complete Amount</Text>
                      <Text style={[styles.value, { color: palette.text }]}>{formatINR(member.planAmount)}</Text>
                    </View>
                    <View style={[styles.detailCol, { alignItems: 'flex-end' }]}>
                      <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Discount</Text>
                      <Text style={[styles.value, { color: palette.text }]}>
                        {member.discountType === 'percent' ? `${member.discountValue}%` : formatINR(member.discountValue)}
                      </Text>
                    </View>
                    <View style={styles.detailCol}>
                      <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Paid</Text>
                      <Text style={[styles.value, { color: palette.statusActiveText }]}>{formatINR(member.paidAmount)}</Text>
                    </View>
                    <View style={[styles.detailCol, { alignItems: 'flex-end' }]}>
                      <Text style={[styles.labelSmall, { color: palette.textMuted }]}>Due Amount</Text>
                      <Text style={[styles.value, { color: member.dueAmount > 0 ? palette.statusExpiredText : palette.text }]}>
                        {formatINR(member.dueAmount)}
                      </Text>
                    </View>
                  </View>
                </View>
              </ScrollView>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <Text style={{ color: palette.textMuted }}>No active plan</Text>
                <Pressable
                  style={[styles.smallBtn, { backgroundColor: accent, marginTop: 10 }]}
                  onPress={() => guard('memberships.edit', () => { setAllPlansVisible(false); onOpenRenewPlan(member); })}
                >
                  <Text style={styles.smallBtnText}>Assign Plan</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Photo View Modal (WhatsApp style) ── */}
      <Modal
        visible={photoViewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoViewVisible(false)}
        statusBarTranslucent
      >
        <Pressable style={styles.photoModalOverlay} onPress={() => setPhotoViewVisible(false)}>
          {/* Top bar */}
          <View style={styles.photoModalTopBar}>
            <View style={[styles.photoModalSmallAvatar, { backgroundColor: accent }]}>
              <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 14 }}>
                {member.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.photoModalName} numberOfLines={1}>{member.name}</Text>
            <Pressable onPress={() => setPhotoViewVisible(false)} hitSlop={12}>
              <Ionicons name="close" size={26} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Big circle photo in center */}
          <View style={styles.photoModalCenter}>
            {member.photoUrl ? (
              <Image
                source={{ uri: `getPhotoUri(member.photoUrl)!` }}
                style={styles.photoModalImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.photoModalImage, { backgroundColor: accent, alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ color: '#FFF', fontSize: 72, fontWeight: '800' }}>
                  {member.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {/* Update button */}
          <Pressable
            style={styles.photoModalUpdateBtn}
            onPress={() => { setPhotoViewVisible(false); setTimeout(handleUpdatePhoto, 300); }}
          >
            <Ionicons name="camera-outline" size={20} color="#FFFFFF" />
            <Text style={styles.photoModalUpdateText}>Update Photo</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function SectionCard({
  title,
  countLabel,
  onCountPress,
  actionLabel,
  onAction,
  palette,
  accent,
  children,
}: {
  title: string;
  countLabel?: string;
  onCountPress?: () => void;
  actionLabel?: string;
  onAction?: () => void;
  palette: any;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionHeaderText, { color: palette.text }]}>{title}</Text>
        {countLabel && (
          onCountPress ? (
            <Pressable onPress={onCountPress} hitSlop={8}>
              <Text style={{ color: accent, fontWeight: '700', fontSize: 12.5 }}>{countLabel}</Text>
            </Pressable>
          ) : (
            <Text style={{ color: accent, fontWeight: '700', fontSize: 12.5 }}>{countLabel}</Text>
          )
        )}
      </View>
      {children}
      {actionLabel && onAction && (
        <Pressable onPress={onAction} style={styles.linkBtn}>
          <Ionicons name="add-circle-outline" size={16} color={accent} />
          <Text style={[styles.linkText, { color: accent }]}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  topBar: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 },
  backBtn: { padding: 4 },
  topTitle: { fontSize: 18, fontWeight: '800' },

  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
  avatarWrap: { position: 'relative', width: 64, height: 64, marginRight: 14 },
  avatarImg: { width: 64, height: 64, borderRadius: 32 },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#006666',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },  labelSmall: { fontSize: 11.5, fontWeight: '600' },
  value: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  valueBold: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 16 },
  detailCol: { width: '48%', marginBottom: 10 },

  actionBtn: { alignItems: 'center', paddingHorizontal: 10, gap: 4 },
  actionLabel: { fontSize: 11, fontWeight: '600' },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionHeaderText: { fontSize: 16, fontWeight: '800' },
  planNameRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },

  divider: { height: 1, marginVertical: 14 },
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  smallBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12.5 },

  paymentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(128,128,128,0.15)' },
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, flexWrap: 'wrap', gap: 8 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  linkText: { fontWeight: '700', fontSize: 12.5 },

  pillRowWrap: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },

  assignedRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: 'rgba(128,128,128,0.15)' },
  monthNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 10 },
  attendanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: 'rgba(128,128,128,0.15)' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 380, borderRadius: 18, borderWidth: 1, padding: 20 },
  modalTitle: { fontSize: 17, fontWeight: '800', marginBottom: 16 },
  modalLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, height: 52 },
  input: { flex: 1, fontSize: 15 },
  methodPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  detailModalName: { fontSize: 17, fontWeight: '800', marginBottom: 12 },
  detailModalGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  detailModalCell: { width: '48%', marginBottom: 12 },

  // Photo view modal
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 40,
  },
  photoModalTopBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 16,
    gap: 12,
  },
  photoModalSmallAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoModalName: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  photoModalCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoModalImage: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  photoModalUpdateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 28,
    marginBottom: 10,
  },
  photoModalUpdateText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  StyleSheet,
  Modal,
  Animated,
  Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthUser } from '../services/auth.service';
import { getMyProfile, Member, MembershipPlan } from '../services/member.service';
import { listPTPlans, PTPlan } from '../services/ptPlan.service';
import { listDietPlans, DietPlan } from '../services/dietPlan.service';
import { listWorkoutPlans, WorkoutPlan } from '../services/workoutPlan.service';
import { listServicePlans, ServicePlan } from '../services/servicePlan.service';
import { listBatches, Batch } from '../services/batch.service';
import { listPublicTrainers, PublicTrainer } from '../services/teamMember.service';
import { getMyAttendanceHistory, AttendanceRecord } from '../services/attendance.service';
import { formatTime12h } from '../utils/date';
import { BASE_URL } from '../config/api';

const { width: SCREEN_W } = Dimensions.get('window');

const P = {
  bg: '#000000',
  card: 'rgba(255,255,255,0.04)',
  cardBorder: 'rgba(255,255,255,0.09)',
  surface: 'rgba(255,255,255,0.07)',
  red: '#FF1739',
  redSoft: '#FF3B5C',
  redDeep: '#B4102A',
  redGlow: 'rgba(255,23,57,0.18)',
  white: '#FFFFFF',
  textMuted: '#9A9CA6',
  textFaint: '#5E6069',
  success: '#2ED573',
  warning: '#FFB020',
  inputBg: 'rgba(255,255,255,0.06)',
  inputBorder: 'rgba(255,255,255,0.12)',
};

// ─── Carousel Slide Images (online gym images using placeholders) ─────────────
const SLIDES = [
  { id: '1', uri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', caption: 'Push Your Limits' },
  { id: '2', uri: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80', caption: 'Build Your Strength' },
  { id: '3', uri: 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=800&q=80', caption: 'Elite Training' },
  { id: '4', uri: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80', caption: 'Train Hard, Live Better' },
];

const getTrainerInitials = (name: string) => {
  const parts = (name || '').trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
};

const FACILITIES = [
  { icon: 'barbell-outline', name: 'Heavy Weights', desc: 'Premium free weights & machines' },
  { icon: 'bicycle-outline', name: 'Cardio Zone', desc: 'Treadmills, cycles & rowing' },
  { icon: 'water-outline', name: 'Steam Room', desc: 'Relax & recover post workout' },
  { icon: 'nutrition-outline', name: 'Protein Bar', desc: 'Supplements & nutrition counter' },
  { icon: 'flash-outline', name: 'CrossFit Box', desc: 'Functional & HIIT training' },
  { icon: 'person-circle-outline', name: 'PT Sessions', desc: '1-on-1 expert coaching' },
];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MOTIVATIONS = [
  "Success starts with self-discipline. 💪",
  "Every rep brings you closer to your goal! 🔥",
  "Your only competition is yesterday's you. ⚡",
  "Hard work beats talent when talent doesn't work hard.",
  "The pain you feel today is the strength you'll feel tomorrow.",
];

type Tab = 'home' | 'attendance' | 'plans' | 'idcard' | 'profile';
type PlanTab = 'gym' | 'pt' | 'diet' | 'workout' | 'service';
type CardMode = 'classic' | 'professional' | 'modern';

interface Props {
  user: AuthUser;
  token: string;
  onLogout: () => void;
}

export default function UserPortalScreen({ user, onLogout }: Props) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  useEffect(() => {
    getMyProfile()
      .then(data => setMember(data.member))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isMember = !!member;

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar style="light" />
        <ActivityIndicator color={P.red} size="large" />
        <Text style={{ color: P.textMuted, marginTop: 14, fontSize: 14 }}>Loading your profile…</Text>
      </View>
    );
  }

  const tabs: { id: Tab; icon: any; label: string; memberOnly: boolean }[] = [
    { id: 'home', icon: 'home', label: 'Home', memberOnly: false },
    ...(isMember ? [{ id: 'attendance' as Tab, icon: 'calendar', label: 'Attendance', memberOnly: true }] : []),
    { id: 'plans', icon: 'card', label: 'Plans', memberOnly: false },
    ...(isMember ? [{ id: 'idcard' as Tab, icon: 'id-card', label: 'ID Card', memberOnly: true }] : []),
    { id: 'profile', icon: 'person', label: 'Profile', memberOnly: false },
  ];

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      <StatusBar style="light" />

      {/* Content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'home' && <HomeTab member={member} user={user} />}
        {activeTab === 'attendance' && isMember && <AttendanceTab member={member!} />}
        {activeTab === 'plans' && <PlansTab member={member} />}
        {activeTab === 'idcard' && isMember && <IDCardTab member={member!} />}
        {activeTab === 'profile' && (
          <ProfileTab member={member} user={user} onLogout={() => setLogoutModalVisible(true)} />
        )}
      </View>

      {/* Bottom Tab Bar */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom > 0 ? 0 : 8 }]}>
        {tabs.map(tab => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
            >
              {active && <View style={styles.tabActivePill} />}
              <Ionicons
                name={active ? tab.icon : `${tab.icon}-outline` as any}
                size={22}
                color={active ? P.red : P.textFaint}
              />
              <Text style={[styles.tabLabel, { color: active ? P.red : P.textFaint }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Logout Confirm Modal */}
      <Modal visible={logoutModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Logout?</Text>
            <Text style={styles.modalSub}>Are you sure you want to sign out?</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setLogoutModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setLogoutModalVisible(false); onLogout(); }}
                activeOpacity={0.85}
              >
                <LinearGradient colors={[P.redSoft, P.red, P.redDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalLogoutBtn}>
                  <Text style={styles.modalLogoutText}>Sign Out</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── HOME TAB ────────────────────────────────────────────────────────────────

const WORKOUT_SCHEDULE = [
  { day: 'Monday', focus: 'Chest & Triceps 🏋️‍♂️', target: 'Push Strength & Upper Body Hypertrophy' },
  { day: 'Tuesday', focus: 'Back & Biceps 🏋️‍♀️', target: 'Pull Power & Lats Thickness' },
  { day: 'Wednesday', focus: 'Legs & Abs 🦵', target: 'Quads, Hamstrings & Core Stability' },
  { day: 'Thursday', focus: 'Shoulders & Traps ⚡', target: 'Deltoid Definition & Upper Back' },
  { day: 'Friday', focus: 'Full Body HIIT 🔥', target: 'Metabolic Conditioning & Fat Burn' },
  { day: 'Saturday', focus: 'CrossFit & Cardio 🏃', target: 'Stamina, Agility & Endurance' },
  { day: 'Sunday', focus: 'Active Recovery & Stretch 🧘', target: 'Foam Rolling, Mobility & Rest' },
];

const GYM_RULES = [
  { icon: 'footsteps-outline', title: 'Clean Sports Shoes', desc: 'Wear clean indoor athletic shoes on workout floor.' },
  { icon: 'barbell-outline', title: 'Re-Rack Weights', desc: 'Return all dumbbells & plates to racks after use.' },
  { icon: 'sparkles-outline', title: 'Use Towel', desc: 'Wipe benches and machines after completing your set.' },
  { icon: 'people-outline', title: 'Share Equipment', desc: 'Allow others to work in between sets during peak hours.' },
];

function HomeTab({ member, user }: { member: Member | null; user: AuthUser }) {
  const insets = useSafeAreaInsets();
  const flatRef = useRef<FlatList>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [trainers, setTrainers] = useState<PublicTrainer[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const motivationText = MOTIVATIONS[new Date().getDay() % MOTIVATIONS.length];

  const todayIndex = (new Date().getDay() + 6) % 7; // Monday = 0
  const todayWorkout = WORKOUT_SCHEDULE[todayIndex];

  useEffect(() => {
    const timer = setInterval(() => {
      const next = (slideIndex + 1) % SLIDES.length;
      setSlideIndex(next);
      flatRef.current?.scrollToIndex({ index: next, animated: true });
    }, 3500);
    return () => clearInterval(timer);
  }, [slideIndex]);

  useEffect(() => {
    listPublicTrainers().then(setTrainers).catch(() => {});
    listBatches().then((list) => setBatches(list.filter((b) => b.isActive))).catch(() => {});
  }, []);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 30 }}
    >
      {/* Top Header */}
      <LinearGradient
        colors={['#2A000E', '#140006', '#000000']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.homeHeader, { paddingTop: insets.top + 14 }]}
      >
        <View style={styles.homeHeaderLeft}>
          <View style={styles.homeHeaderGreetingRow}>
            <View style={styles.liveDot} />
            <Text style={styles.homeGreet}>WELCOME BACK</Text>
          </View>
          <Text style={styles.homeName}>{user.name} 👋</Text>
          <Text style={styles.homeSubTag}>TRAIN   •   TRANSFORM   •   BE BETTER</Text>
        </View>

        <View style={styles.homeLogoWrap}>
          <View style={styles.homeLogoGlow} />
          <Image
            source={require('../../assets/A2ProLogo.png')}
            style={styles.homeLogoImg}
            resizeMode="contain"
          />
        </View>
      </LinearGradient>

      {/* Image Slider */}
      <FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={i => i.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={{ width: SCREEN_W, height: 200 }}>
            <Image source={{ uri: item.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.85)']}
              style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 90 }}
            />
            <Text style={styles.sliderCaption}>{item.caption}</Text>
          </View>
        )}
      />
      {/* Dots */}
      <View style={styles.dotRow}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === slideIndex && styles.dotActive]} />
        ))}
      </View>

      {/* Daily Motivation Quote */}
      <View style={styles.sectionPad}>
        <View style={styles.motivationCard}>
          <Ionicons name="flame" size={22} color={P.red} style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: P.red, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 2 }}>
              MOTIVATION OF THE DAY
            </Text>
            <Text style={styles.motivationText}>{motivationText}</Text>
          </View>
        </View>
      </View>

      {/* Today's Workout Focus */}
      <View style={styles.sectionPad}>
        <LinearGradient colors={['rgba(255,23,57,0.15)', 'rgba(0,0,0,0.4)']} style={styles.todayWorkoutCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <View style={styles.todayBadge}>
              <Ionicons name="flash" size={12} color={P.white} />
              <Text style={styles.todayBadgeText}>TODAY'S WORKOUT FOCUS</Text>
            </View>
            <Text style={{ color: P.textMuted, fontSize: 12, fontWeight: '700' }}>{todayWorkout.day}</Text>
          </View>
          <Text style={styles.todayFocusTitle}>{todayWorkout.focus}</Text>
          <Text style={styles.todayFocusTarget}>🎯 Target: {todayWorkout.target}</Text>
        </LinearGradient>
      </View>

      {/* Gym Announcement Special Banner */}
      <View style={styles.sectionPad}>
        <View style={styles.announcementCard}>
          <View style={styles.announcementIconWrap}>
            <Ionicons name="megaphone" size={20} color={P.red} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.announcementTitle}>🔥 30-Day Body Transformation Challenge</Text>
            <Text style={styles.announcementSub}>Register at reception & get free personalized diet advice!</Text>
          </View>
        </View>
      </View>

      {/* Weekly Split Schedule */}
      <View style={styles.sectionPad}>
        <Text style={styles.sectionTitle}>📅 Weekly Muscle Split</Text>
        <View style={styles.weeklyBox}>
          {WORKOUT_SCHEDULE.map((item, i) => {
            const isToday = i === todayIndex;
            return (
              <View key={i} style={[styles.weeklyRow, isToday && styles.weeklyRowToday, i < 6 && styles.weeklyRowBorder]}>
                <View style={{ width: 85 }}>
                  <Text style={[styles.weeklyDayText, isToday && { color: P.red, fontWeight: '800' }]}>{item.day}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.weeklyFocusText, isToday && { color: P.white, fontWeight: '700' }]}>{item.focus}</Text>
                </View>
                {isToday && (
                  <View style={styles.todayTag}>
                    <Text style={styles.todayTagText}>TODAY</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* Facilities */}
      <View style={styles.sectionPad}>
        <Text style={styles.sectionTitle}>🏋️ World-Class Facilities</Text>
        <View style={styles.facilityGrid}>
          {FACILITIES.map((f, i) => (
            <View key={i} style={styles.facilityCard}>
              <View style={styles.facilityIconWrap}>
                <Ionicons name={f.icon as any} size={24} color={P.red} />
              </View>
              <Text style={styles.facilityName}>{f.name}</Text>
              <Text style={styles.facilityDesc}>{f.desc}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Gym Rules & Code of Conduct */}
      <View style={styles.sectionPad}>
        <Text style={styles.sectionTitle}>📜 Gym Rules & Etiquette</Text>
        <View style={styles.rulesContainer}>
          {GYM_RULES.map((r, i) => (
            <View key={i} style={styles.ruleCard}>
              <Ionicons name={r.icon as any} size={20} color={P.red} style={{ marginRight: 12, marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.ruleTitle}>{r.title}</Text>
                <Text style={styles.ruleDesc}>{r.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Certified Trainers */}
      <View style={styles.sectionPad}>
        <Text style={styles.sectionTitle}>👨‍💼 Certified Gym Trainers</Text>
        {trainers.length === 0 ? (
          <Text style={{ color: P.textMuted, fontSize: 13 }}>Trainer info coming soon.</Text>
        ) : (
          trainers.map((t) => (
            <View key={t._id} style={styles.trainerCard}>
              <View style={styles.trainerEmoji}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: P.red }}>{getTrainerInitials(t.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.trainerName}>{t.name}</Text>
                <Text style={styles.trainerSpec}>Certified Trainer</Text>
              </View>
              {!!t.mobile && (
                <TouchableOpacity
                  style={styles.trainerExpBadge}
                  onPress={() => Linking.openURL(`tel:${t.countryCode || '+91'}${t.mobile}`)}
                >
                  <Ionicons name="call" size={14} color={P.red} />
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </View>

      {/* Gym Hours & Peak Times */}
      <View style={styles.sectionPad}>
        <Text style={styles.sectionTitle}>⏰ Operating Hours & Peak Times</Text>
        <View style={styles.gymTimingCard}>
          {batches.length === 0 ? (
            <View style={styles.timingRow}>
              <Text style={{ color: P.textMuted, fontSize: 13 }}>Timing info coming soon.</Text>
            </View>
          ) : (
            batches.map((b, i) => (
              <View key={b._id} style={[styles.timingRow, i < batches.length - 1 && styles.timingRowBorder]}>
                <Ionicons name="time-outline" size={18} color={P.red} style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.timingDay}>{b.name}</Text>
                  <Text style={styles.timingTime}>{formatTime12h(b.openTime)} – {formatTime12h(b.closeTime)}</Text>
                </View>
                <Text style={styles.timingPeak}>Up to {b.limit}</Text>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

// ─── ATTENDANCE TAB ───────────────────────────────────────────────────────────

function AttendanceTab({ member }: { member: Member }) {
  const insets = useSafeAreaInsets();
  const now = new Date();
  const [selYear, setSelYear] = useState(now.getFullYear());
  const [selMonth, setSelMonth] = useState(now.getMonth()); // 0-indexed
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyAttendanceHistory(selMonth + 1, selYear);
      setRecords(data.records);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [selMonth, selYear]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  const totalVisits = records.length;
  const totalMinutes = records.reduce((sum, r) => {
    if (r.punchOutTime) {
      return sum + (new Date(r.punchOutTime).getTime() - new Date(r.punchInTime).getTime()) / 60000;
    }
    return sum;
  }, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const daysInMonth = new Date(selYear, selMonth + 1, 0).getDate();
  const attendanceRate = Math.round((totalVisits / daysInMonth) * 100);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };
  const formatDuration = (pIn: string, pOut: string | null) => {
    if (!pOut) return '—';
    const mins = Math.round((new Date(pOut).getTime() - new Date(pIn).getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Header */}
      <LinearGradient colors={['#1A0008', '#000000']} style={[styles.screenHeader, { paddingTop: insets.top + 12 }]}>
        <Ionicons name="calendar" size={22} color={P.red} />
        <Text style={styles.screenHeaderTitle}>My Attendance</Text>
      </LinearGradient>

      {/* Month Picker */}
      <View style={styles.sectionPad}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {MONTHS.map((m, i) => {
            const active = i === selMonth && selYear === now.getFullYear();
            return (
              <TouchableOpacity
                key={i}
                onPress={() => { setSelMonth(i); setSelYear(now.getFullYear()); }}
                style={[styles.monthChip, active && styles.monthChipActive]}
              >
                <Text style={[styles.monthChipText, active && styles.monthChipTextActive]}>{m}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Summary Stats */}
      <View style={[styles.sectionPad, { paddingTop: 0 }]}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{totalVisits}</Text>
            <Text style={styles.statLabel}>Visits</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{attendanceRate}%</Text>
            <Text style={styles.statLabel}>Rate</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{totalHours}h</Text>
            <Text style={styles.statLabel}>Total Time</Text>
          </View>
        </View>
      </View>

      {/* Records */}
      <View style={styles.sectionPad}>
        <Text style={styles.sectionTitle}>📋 {MONTHS[selMonth]} {selYear} Records</Text>
        {loading ? (
          <ActivityIndicator color={P.red} style={{ marginTop: 20 }} />
        ) : records.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="calendar-outline" size={40} color={P.textFaint} />
            <Text style={styles.emptyText}>No attendance records for this month</Text>
          </View>
        ) : (
          records.map((r, i) => (
            <View key={r._id} style={styles.attendanceCard}>
              <View style={styles.attendanceDateBox}>
                <Text style={styles.attendanceDateDay}>{new Date(r.dateStr).getDate()}</Text>
                <Text style={styles.attendanceDateMon}>{MONTHS[new Date(r.dateStr).getMonth()]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.attendanceRow}>
                  <Ionicons name="log-in-outline" size={15} color={P.success} />
                  <Text style={styles.attendanceTimeLabel}>In:</Text>
                  <Text style={styles.attendanceTimeVal}>{formatTime(r.punchInTime)}</Text>
                </View>
                {r.punchOutTime && (
                  <View style={styles.attendanceRow}>
                    <Ionicons name="log-out-outline" size={15} color={P.red} />
                    <Text style={styles.attendanceTimeLabel}>Out:</Text>
                    <Text style={styles.attendanceTimeVal}>{formatTime(r.punchOutTime)}</Text>
                  </View>
                )}
                <Text style={styles.attendanceDuration}>
                  Duration: {formatDuration(r.punchInTime, r.punchOutTime)}
                </Text>
              </View>
              <View style={[styles.attendanceStatusPill, { backgroundColor: r.punchOutTime ? 'rgba(46,213,115,0.15)' : 'rgba(255,176,32,0.15)' }]}>
                <Text style={[styles.attendanceStatusText, { color: r.punchOutTime ? P.success : P.warning }]}>
                  {r.punchOutTime ? 'Present' : 'Punched In'}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

// ─── PLANS TAB ────────────────────────────────────────────────────────────────

function PlansTab({ member }: { member: Member | null }) {
  const insets = useSafeAreaInsets();
  const [planTab, setPlanTab] = useState<PlanTab>('gym');
  const [gymPlans, setGymPlans] = useState<MembershipPlan[]>([]);
  const [ptPlans, setPtPlans] = useState<PTPlan[]>([]);
  const [dietPlans, setDietPlans] = useState<DietPlan[]>([]);
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [servicePlans, setServicePlans] = useState<ServicePlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      import('../services/member.service').then(m => m.listPlans()),
      listPTPlans(),
      listDietPlans(),
      listWorkoutPlans(),
      listServicePlans(),
    ]).then(([gp, pt, diet, workout, svc]) => {
      setGymPlans(gp);
      setPtPlans(pt);
      setDietPlans(diet);
      setWorkoutPlans(workout);
      setServicePlans(svc);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const planTabs: { id: PlanTab; label: string; icon: string }[] = [
    { id: 'gym', label: '🏋️ Gym', icon: 'barbell' },
    { id: 'pt', label: '💪 PT', icon: 'people' },
    { id: 'diet', label: '🥗 Diet', icon: 'nutrition' },
    { id: 'workout', label: '⚡ Workout', icon: 'flash' },
    { id: 'service', label: '🛎 Services', icon: 'star' },
  ];

  const now = new Date();
  const activePlan = member ? (member.planId as any) : null;
  const isActiveMember = !!member && !!member.planExpiryDate && new Date(member.planExpiryDate) > now;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
      <LinearGradient colors={['#1A0008', '#000000']} style={[styles.screenHeader, { paddingTop: insets.top + 12 }]}>
        <Ionicons name="card" size={22} color={P.red} />
        <Text style={styles.screenHeaderTitle}>Plans & Membership</Text>
      </LinearGradient>

      {/* Active plan banner (members only) */}
      {member && (
        <View style={styles.sectionPad}>
          <LinearGradient colors={['#200010', '#1A0008']} style={styles.activePlanBanner}>
            <View style={styles.activePlanRow}>
              <View>
                <Text style={styles.activePlanLabel}>YOUR CURRENT PLAN</Text>
                <Text style={styles.activePlanName}>{activePlan?.name || 'N/A'}</Text>
                <Text style={styles.activePlanSub}>
                  Valid till: {member.planExpiryDate ? new Date(member.planExpiryDate).toLocaleDateString('en-IN') : 'No active plan'}
                </Text>
              </View>
              <View style={[styles.activePlanStatusBadge, { backgroundColor: isActiveMember ? 'rgba(46,213,115,0.2)' : 'rgba(255,23,57,0.2)' }]}>
                <Text style={[styles.activePlanStatusText, { color: isActiveMember ? P.success : P.red }]}>
                  {isActiveMember ? 'Active' : 'Expired'}
                </Text>
              </View>
            </View>
            <View style={styles.activePlanAmountRow}>
              <View>
                <Text style={styles.activePlanAmountLabel}>Paid</Text>
                <Text style={styles.activePlanAmountVal}>₹{member.paidAmount.toLocaleString('en-IN')}</Text>
              </View>
              {member.dueAmount > 0 && (
                <View>
                  <Text style={styles.activePlanAmountLabel}>Due</Text>
                  <Text style={[styles.activePlanAmountVal, { color: P.red }]}>₹{member.dueAmount.toLocaleString('en-IN')}</Text>
                </View>
              )}
              <View>
                <Text style={styles.activePlanAmountLabel}>Member ID</Text>
                <Text style={styles.activePlanAmountVal}>#{member.membershipId}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Plan category tabs */}
      <View style={styles.sectionPad}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {planTabs.map(pt => (
            <TouchableOpacity
              key={pt.id}
              onPress={() => setPlanTab(pt.id)}
              style={[styles.planTabChip, planTab === pt.id && styles.planTabChipActive]}
            >
              <Text style={[styles.planTabChipText, planTab === pt.id && styles.planTabChipTextActive]}>
                {pt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator color={P.red} style={{ marginTop: 30 }} />
      ) : (
        <View style={styles.sectionPad}>
          {planTab === 'gym' && gymPlans.map(p => (
            <GymPlanCard key={p._id} plan={p} isCurrent={activePlan?._id === p._id} />
          ))}
          {planTab === 'pt' && ptPlans.map(p => (
            <PTPlanCard key={p._id} plan={p} />
          ))}
          {planTab === 'diet' && dietPlans.map(p => (
            <DietPlanCard key={p._id} plan={p} />
          ))}
          {planTab === 'workout' && workoutPlans.map(p => (
            <WorkoutPlanCard key={p._id} plan={p} />
          ))}
          {planTab === 'service' && servicePlans.map(p => (
            <ServicePlanCard key={p._id} plan={p} />
          ))}
          {planTab === 'gym' && gymPlans.length === 0 && <EmptyPlan label="No gym plans available" />}
          {planTab === 'pt' && ptPlans.length === 0 && <EmptyPlan label="No PT plans available" />}
          {planTab === 'diet' && dietPlans.length === 0 && <EmptyPlan label="No diet plans available" />}
          {planTab === 'workout' && workoutPlans.length === 0 && <EmptyPlan label="No workout plans available" />}
          {planTab === 'service' && servicePlans.length === 0 && <EmptyPlan label="No service plans available" />}
        </View>
      )}
    </ScrollView>
  );
}

function GymPlanCard({ plan, isCurrent }: { plan: MembershipPlan; isCurrent: boolean }) {
  const dur = plan.durationUnit === 'months' ? `${plan.durationValue} Month${plan.durationValue > 1 ? 's' : ''}` : `${plan.durationValue} Days`;
  return (
    <View style={[styles.planCard, isCurrent && styles.planCardCurrent]}>
      {isCurrent && <View style={styles.planCardCurrentBadge}><Text style={styles.planCardCurrentBadgeText}>YOUR PLAN</Text></View>}
      <View style={styles.planCardRow}>
        <View>
          <Text style={styles.planCardName}>{plan.name}</Text>
          <Text style={styles.planCardDur}>⏳ {dur}</Text>
        </View>
        <Text style={styles.planCardPrice}>₹{plan.amount.toLocaleString('en-IN')}</Text>
      </View>
    </View>
  );
}

function PTPlanCard({ plan }: { plan: PTPlan }) {
  const dur = plan.isSessionBased ? `${plan.sessions} Sessions` : `${plan.durationValue} ${plan.durationUnit}`;
  return (
    <View style={styles.planCard}>
      <View style={styles.planCardRow}>
        <View>
          <Text style={styles.planCardName}>{plan.name}</Text>
          <Text style={styles.planCardDur}>💪 {dur}</Text>
        </View>
        <Text style={styles.planCardPrice}>₹{plan.amount.toLocaleString('en-IN')}</Text>
      </View>
    </View>
  );
}

function DietPlanCard({ plan }: { plan: DietPlan }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={styles.planCard}>
      <TouchableOpacity onPress={() => setExpanded(e => !e)} activeOpacity={0.8}>
        <View style={styles.planCardRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.planCardName}>{plan.name}</Text>
            <Text style={styles.planCardDur}>🥗 {plan.days.length} Day Plan{plan.days.length !== 1 ? 's' : ''}</Text>
          </View>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={P.textMuted} />
        </View>
      </TouchableOpacity>
      {expanded && plan.days.slice(0, 3).map((d, i) => (
        <View key={i} style={styles.planExpandRow}>
          <Text style={styles.planExpandTitle}>{d.title || `Day ${i + 1}`}</Text>
          {d.meals.slice(0, 2).map((m, j) => (
            <Text key={j} style={styles.planExpandItem}>• {m.name} {m.quantity ? `(${m.quantity})` : ''}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function WorkoutPlanCard({ plan }: { plan: WorkoutPlan }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={styles.planCard}>
      <TouchableOpacity onPress={() => setExpanded(e => !e)} activeOpacity={0.8}>
        <View style={styles.planCardRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.planCardName}>{plan.name}</Text>
            <Text style={styles.planCardDur}>⚡ {plan.days.length} Day{plan.days.length !== 1 ? 's' : ''}</Text>
          </View>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={P.textMuted} />
        </View>
      </TouchableOpacity>
      {expanded && plan.days.slice(0, 3).map((d, i) => (
        <View key={i} style={styles.planExpandRow}>
          <Text style={styles.planExpandTitle}>{d.title || `Day ${i + 1}`}</Text>
          {d.exercises.slice(0, 2).map((e, j) => (
            <Text key={j} style={styles.planExpandItem}>• {e.name} — {e.sets}×{e.reps}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function ServicePlanCard({ plan }: { plan: ServicePlan }) {
  return (
    <View style={styles.planCard}>
      <View style={styles.planCardRow}>
        <Text style={styles.planCardName}>{plan.name}</Text>
        <Text style={styles.planCardPrice}>₹{plan.amount.toLocaleString('en-IN')}</Text>
      </View>
    </View>
  );
}

function EmptyPlan({ label }: { label: string }) {
  return (
    <View style={styles.emptyBox}>
      <Ionicons name="document-outline" size={36} color={P.textFaint} />
      <Text style={styles.emptyText}>{label}</Text>
    </View>
  );
}

// ─── ID CARD TAB ──────────────────────────────────────────────────────────────

function IDCardTab({ member }: { member: Member }) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<CardMode>('classic');
  const photoUrl = member.photoUrl ? `${BASE_URL}${member.photoUrl}` : null;
  const plan = (member.planId as any)?.name || 'Member';
  const expiryStr = member.planExpiryDate ? new Date(member.planExpiryDate).toLocaleDateString('en-IN') : '-';
  const joinStr = new Date(member.joiningDate).toLocaleDateString('en-IN');

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
      <LinearGradient colors={['#1A0008', '#000000']} style={[styles.screenHeader, { paddingTop: insets.top + 12 }]}>
        <Ionicons name="id-card" size={22} color={P.red} />
        <Text style={styles.screenHeaderTitle}>Digital ID Card</Text>
      </LinearGradient>

      {/* Mode Switcher */}
      <View style={[styles.sectionPad, { flexDirection: 'row', gap: 10 }]}>
        {(['classic', 'professional', 'modern'] as CardMode[]).map(m => (
          <TouchableOpacity
            key={m}
            onPress={() => setMode(m)}
            style={[styles.cardModeBtn, mode === m && styles.cardModeBtnActive]}
          >
            <Text style={[styles.cardModeBtnText, mode === m && styles.cardModeBtnTextActive]}>
              {m === 'classic' ? '🏅 Classic' : m === 'professional' ? '💼 Pro' : '⚡ Modern'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ padding: 20, alignItems: 'center' }}>
        {mode === 'classic' && <ClassicCard member={member} photoUrl={photoUrl} plan={plan} expiryStr={expiryStr} joinStr={joinStr} />}
        {mode === 'professional' && <ProfessionalCard member={member} photoUrl={photoUrl} plan={plan} expiryStr={expiryStr} joinStr={joinStr} />}
        {mode === 'modern' && <ModernCard member={member} photoUrl={photoUrl} plan={plan} expiryStr={expiryStr} joinStr={joinStr} />}
      </View>
    </ScrollView>
  );
}

interface CardProps {
  member: Member;
  photoUrl: string | null;
  plan: string;
  expiryStr: string;
  joinStr: string;
}

function ClassicCard({ member, photoUrl, plan, expiryStr, joinStr }: CardProps) {
  return (
    <View style={styles.classicCard}>
      {/* Slim elegant header with top accent line */}
      <View style={styles.classicTopHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Image source={require('../../assets/A2ProLogo.png')} style={{ width: 26, height: 26 }} resizeMode="contain" />
          <View>
            <Text style={styles.classicGymName}>A2 PRO FITNESS</Text>
            <Text style={styles.classicCardLabel}>OFFICIAL MEMBER PASS</Text>
          </View>
        </View>
        <View style={styles.classicHeaderPill}>
          <Text style={styles.classicHeaderPillText}>MEMBER</Text>
        </View>
      </View>
      <View style={styles.classicBody}>
        <View style={styles.classicPhotoSection}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.classicPhoto} />
          ) : (
            <View style={[styles.classicPhoto, styles.classicPhotoPlaceholder]}>
              <Text style={{ fontSize: 32, color: P.textMuted }}>👤</Text>
            </View>
          )}
          <View style={styles.classicIdBadge}>
            <Text style={styles.classicIdText}>#{member.membershipId}</Text>
          </View>
        </View>
        <View style={{ flex: 1, paddingLeft: 14 }}>
          <Text style={styles.classicMemberName}>{member.name}</Text>
          <Text style={styles.classicPlanBadge}>{plan}</Text>
          <View style={styles.classicInfoRow}>
            <Ionicons name="person-outline" size={13} color={P.textMuted} />
            <Text style={styles.classicInfoText}>{member.gender === 'male' ? 'Male' : 'Female'}</Text>
          </View>
          <View style={styles.classicInfoRow}>
            <Ionicons name="call-outline" size={13} color={P.textMuted} />
            <Text style={styles.classicInfoText}>{member.mobile}</Text>
          </View>
          <View style={styles.classicInfoRow}>
            <Ionicons name="calendar-outline" size={13} color={P.textMuted} />
            <Text style={styles.classicInfoText}>Joined: {joinStr}</Text>
          </View>
        </View>
      </View>
      <LinearGradient colors={['#1A0008', '#0D0005']} style={styles.classicFooter}>
        <View>
          <Text style={styles.classicFooterLabel}>VALID TILL</Text>
          <Text style={styles.classicFooterValue}>{expiryStr}</Text>
        </View>
        <View style={styles.classicBarcode}>
          {Array.from({ length: 20 }).map((_, i) => (
            <View key={i} style={[styles.classicBarcodeBar, { width: i % 3 === 0 ? 3 : 1.5, backgroundColor: i % 5 === 0 ? '#FF3555' : P.white }]} />
          ))}
        </View>
      </LinearGradient>
    </View>
  );
}

function ProfessionalCard({ member, photoUrl, plan, expiryStr, joinStr }: CardProps) {
  return (
    <LinearGradient colors={['#0D0D0D', '#1A1A1A', '#111111']} style={styles.proCard}>
      {/* Sleek metallic top header */}
      <View style={styles.proTopHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Image source={require('../../assets/A2ProLogo.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />
          <Text style={styles.proGymName}>A2 PRO FITNESS</Text>
        </View>
        <View style={styles.proVipPill}>
          <Ionicons name="star" size={10} color="#FF3555" />
          <Text style={styles.proVipPillText}>VIP PRO</Text>
        </View>
      </View>
      <View style={styles.proBody}>
        <View style={styles.proPhotoWrap}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.proPhoto} />
          ) : (
            <View style={[styles.proPhoto, { backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="person" size={36} color={P.textMuted} />
            </View>
          )}
          <LinearGradient colors={['#FF3555', '#D90026']} style={styles.proBadge}>
            <Text style={styles.proBadgeText}>{plan.substring(0, 8)}</Text>
          </LinearGradient>
        </View>
        <View style={{ flex: 1, paddingLeft: 16 }}>
          <Text style={styles.proName}>{member.name}</Text>
          <Text style={styles.proIdText}>ID: #{member.membershipId}</Text>
          <Text style={styles.proMobile}>{member.mobile}</Text>
        </View>
      </View>
      <View style={styles.proDivider} />
      <View style={styles.proInfoGrid}>
        {[
          { label: 'GENDER', value: member.gender === 'male' ? 'Male' : 'Female' },
          { label: 'JOINED', value: joinStr },
          { label: 'VALID TILL', value: expiryStr },
          { label: 'BATCH', value: member.batchLabel || 'General' },
        ].map((item, i) => (
          <View key={i} style={styles.proInfoItem}>
            <Text style={styles.proInfoLabel}>{item.label}</Text>
            <Text style={styles.proInfoValue}>{item.value}</Text>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

function ModernCard({ member, photoUrl, plan, expiryStr, joinStr }: CardProps) {
  return (
    <View style={styles.modernCard}>
      {/* Neon border effect */}
      <View style={styles.modernNeonBorder} />
      <LinearGradient colors={['#0A0A0A', '#111827']} style={styles.modernInner}>
        <View style={styles.modernTopRow}>
          <View>
            <Text style={styles.modernGymTag}>⚡ A2 PRO FITNESS</Text>
            <Text style={styles.modernTitle}>ELITE MEMBER</Text>
          </View>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.modernPhoto} />
          ) : (
            <View style={[styles.modernPhoto, { backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="person" size={28} color={P.red} />
            </View>
          )}
        </View>
        <Text style={styles.modernName}>{member.name}</Text>
        <View style={styles.modernPlanRow}>
          <LinearGradient colors={[P.red, P.redDeep]} style={styles.modernPlanBadge}>
            <Text style={styles.modernPlanBadgeText}>{plan}</Text>
          </LinearGradient>
          <Text style={styles.modernId}>#{member.membershipId}</Text>
        </View>
        <View style={styles.modernDivider} />
        <View style={styles.modernDataRow}>
          <View>
            <Text style={styles.modernDataLabel}>VALID TILL</Text>
            <Text style={styles.modernDataValue}>{expiryStr}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.modernDataLabel}>MOBILE</Text>
            <Text style={styles.modernDataValue}>{member.mobile}</Text>
          </View>
        </View>
        {/* Cyber lines */}
        <View style={styles.modernCyberStrip}>
          {Array.from({ length: 30 }).map((_, i) => (
            <View key={i} style={[styles.modernCyberLine, { opacity: 0.3 + (i % 4) * 0.15, height: 8 + (i % 3) * 6 }]} />
          ))}
        </View>
      </LinearGradient>
    </View>
  );
}

// ─── PROFILE TAB ─────────────────────────────────────────────────────────────

function ProfileTab({ member, user, onLogout }: { member: Member | null; user: AuthUser; onLogout: () => void }) {
  const insets = useSafeAreaInsets();
  const photoUrl = member?.photoUrl ? `${BASE_URL}${member.photoUrl}` : null;
  const isActiveMember = member && !!member.planExpiryDate && new Date(member.planExpiryDate) > new Date();

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
      <LinearGradient colors={['#1A0008', '#000000']} style={[styles.screenHeader, { paddingTop: insets.top + 12 }]}>
        <Ionicons name="person" size={22} color={P.red} />
        <Text style={styles.screenHeaderTitle}>My Profile</Text>
      </LinearGradient>

      {/* Avatar & Name */}
      <View style={styles.profileAvatarSection}>
        <View style={styles.profileAvatarWrap}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.profileAvatar} />
          ) : (
            <LinearGradient colors={['#FF1739', '#8B0000']} style={styles.profileAvatar}>
              <Text style={{ fontSize: 40, color: P.white }}>
                {user.name.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
          )}
          {member && (
            <View style={[styles.profileStatusDot, { backgroundColor: isActiveMember ? P.success : P.red }]} />
          )}
        </View>
        <Text style={styles.profileName}>{user.name}</Text>
        <Text style={styles.profileEmail}>{user.email}</Text>
        {member && (
          <View style={styles.profileMemberBadge}>
            <Ionicons name="shield-checkmark" size={14} color={P.red} />
            <Text style={styles.profileMemberBadgeText}>GYM MEMBER • #{member.membershipId}</Text>
          </View>
        )}
      </View>

      {/* Details */}
      <View style={styles.sectionPad}>
        {member ? (
          <>
            <Text style={styles.sectionTitle}>👤 Personal Info</Text>
            {[
              { icon: 'person-outline', label: 'Full Name', value: member.name },
              { icon: 'call-outline', label: 'Mobile', value: `${member.countryCode} ${member.mobile}` },
              { icon: 'mail-outline', label: 'Email', value: member.email },
              { icon: 'person-outline', label: 'Gender', value: member.gender === 'male' ? 'Male' : 'Female' },
              ...(member.dob ? [{ icon: 'calendar-outline', label: 'Date of Birth', value: new Date(member.dob).toLocaleDateString('en-IN') }] : []),
              ...(member.address ? [{ icon: 'home-outline', label: 'Address', value: member.address }] : []),
            ].map((row, i) => (
              <ProfileRow key={i} icon={row.icon as any} label={row.label} value={row.value} />
            ))}

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>🏋️ Membership Info</Text>
            {[
              { icon: 'card-outline', label: 'Member ID', value: `#${member.membershipId}` },
              { icon: 'barbell-outline', label: 'Current Plan', value: (member.planId as any)?.name || 'N/A' },
              { icon: 'people-outline', label: 'Batch', value: member.batchLabel || 'General' },
              { icon: 'calendar-outline', label: 'Joining Date', value: new Date(member.joiningDate).toLocaleDateString('en-IN') },
              { icon: 'time-outline', label: 'Plan Expiry', value: member.planExpiryDate ? new Date(member.planExpiryDate).toLocaleDateString('en-IN') : 'No active plan' },
              { icon: 'cash-outline', label: 'Paid Amount', value: `₹${member.paidAmount.toLocaleString('en-IN')}` },
              ...(member.dueAmount > 0 ? [{ icon: 'alert-circle-outline', label: 'Due Amount', value: `₹${member.dueAmount.toLocaleString('en-IN')}` }] : []),
            ].map((row, i) => (
              <ProfileRow key={i} icon={row.icon as any} label={row.label} value={row.value} />
            ))}
          </>
        ) : (
          <View style={styles.guestProfileBox}>
            <Ionicons name="person-circle-outline" size={64} color={P.textFaint} />
            <Text style={styles.guestProfileTitle}>Not a Member Yet?</Text>
            <Text style={styles.guestProfileSub}>
              Visit A2 Pro Fitness and enroll to access full membership benefits, attendance tracking, and your digital ID card.
            </Text>
            <LinearGradient colors={[P.redSoft, P.red, P.redDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.guestEnrollBtn}>
              <Text style={styles.guestEnrollText}>Explore Plans →</Text>
            </LinearGradient>
          </View>
        )}
      </View>

      {/* Logout */}
      <View style={[styles.sectionPad, { marginTop: 8 }]}>
        <TouchableOpacity onPress={onLogout} style={styles.logoutBtn} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color={P.red} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function ProfileRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.profileRow}>
      <Ionicons name={icon} size={16} color={P.red} style={{ marginRight: 10 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.profileRowLabel}>{label}</Text>
        <Text style={styles.profileRowValue}>{value}</Text>
      </View>
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: P.bg },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0A0A0A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 8,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 3, paddingBottom: 4 },
  tabActivePill: {
    position: 'absolute',
    top: -8,
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: P.red,
  },
  tabLabel: { fontSize: 10, fontWeight: '600' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#141414', borderRadius: 20, padding: 28, width: SCREEN_W * 0.82, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalTitle: { color: P.white, fontSize: 20, fontWeight: '800', marginBottom: 8 },
  modalSub: { color: P.textMuted, fontSize: 14, marginBottom: 24 },
  modalBtns: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: { flex: 1, height: 46, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  modalCancelText: { color: P.textMuted, fontWeight: '600' },
  modalLogoutBtn: { flex: 1, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  modalLogoutText: { color: P.white, fontWeight: '700' },

  // Screens
  screenHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingBottom: 18 },
  screenHeaderTitle: { color: P.white, fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },

  // Home
  homeHeader: {
    paddingHorizontal: 20,
    paddingBottom: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,23,57,0.15)',
  },
  homeHeaderLeft: { flex: 1, paddingRight: 12 },
  homeHeaderGreetingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: P.red },
  homeGreet: { color: P.red, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  homeName: { color: P.white, fontSize: 20, fontWeight: '900', letterSpacing: 0.3 },
  homeSubTag: { color: P.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginTop: 4 },

  homeLogoWrap: {
    position: 'relative',
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: 'rgba(255,23,57,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,23,57,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeLogoGlow: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: P.red,
    opacity: 0.15,
  },
  homeLogoImg: {
    width: 38,
    height: 38,
  },

  sliderCaption: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    color: P.white,
    fontSize: 16,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  dotRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: P.textFaint },
  dotActive: { width: 18, backgroundColor: P.red },

  sectionPad: { paddingHorizontal: 18, paddingBottom: 16 },
  sectionTitle: { color: P.white, fontSize: 15, fontWeight: '700', marginBottom: 12, letterSpacing: 0.3 },

  todayWorkoutCard: { borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,23,57,0.3)' },
  todayBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: P.red, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  todayBadgeText: { color: P.white, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  todayFocusTitle: { color: P.white, fontSize: 18, fontWeight: '900', marginBottom: 4 },
  todayFocusTarget: { color: P.textMuted, fontSize: 12 },

  announcementCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,23,57,0.06)', borderWidth: 1, borderColor: 'rgba(255,23,57,0.2)', borderRadius: 14, padding: 14, gap: 12 },
  announcementIconWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,23,57,0.15)', justifyContent: 'center', alignItems: 'center' },
  announcementTitle: { color: P.white, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  announcementSub: { color: P.textMuted, fontSize: 11, lineHeight: 16 },

  weeklyBox: { backgroundColor: P.card, borderWidth: 1, borderColor: P.cardBorder, borderRadius: 14, overflow: 'hidden' },
  weeklyRow: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  weeklyRowToday: { backgroundColor: 'rgba(255,23,57,0.12)' },
  weeklyRowBorder: { borderBottomWidth: 1, borderBottomColor: P.cardBorder },
  weeklyDayText: { color: P.textMuted, fontSize: 12, fontWeight: '600' },
  weeklyFocusText: { color: P.textMuted, fontSize: 12 },
  todayTag: { backgroundColor: P.red, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  todayTagText: { color: P.white, fontSize: 9, fontWeight: '800' },

  rulesContainer: { gap: 10 },
  ruleCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: P.card, borderWidth: 1, borderColor: P.cardBorder, borderRadius: 12, padding: 12 },
  ruleTitle: { color: P.white, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  ruleDesc: { color: P.textMuted, fontSize: 11, lineHeight: 16 },

  motivationCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,23,57,0.08)', borderWidth: 1, borderColor: 'rgba(255,23,57,0.2)', borderRadius: 14, padding: 14 },
  motivationText: { color: P.white, fontSize: 13, fontWeight: '600', flex: 1, lineHeight: 20 },

  facilityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  facilityCard: { width: (SCREEN_W - 48) / 2, backgroundColor: P.card, borderWidth: 1, borderColor: P.cardBorder, borderRadius: 14, padding: 14, gap: 6 },
  facilityIconWrap: { width: 42, height: 42, borderRadius: 10, backgroundColor: 'rgba(255,23,57,0.12)', justifyContent: 'center', alignItems: 'center' },
  facilityName: { color: P.white, fontSize: 13, fontWeight: '700' },
  facilityDesc: { color: P.textMuted, fontSize: 11 },

  trainerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: P.card, borderWidth: 1, borderColor: P.cardBorder, borderRadius: 14, padding: 14, marginBottom: 10, gap: 12 },
  trainerEmoji: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,23,57,0.1)', justifyContent: 'center', alignItems: 'center' },
  trainerName: { color: P.white, fontSize: 14, fontWeight: '700' },
  trainerSpec: { color: P.textMuted, fontSize: 12, marginTop: 2 },
  trainerExpBadge: { backgroundColor: 'rgba(255,23,57,0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  trainerExpText: { color: P.red, fontSize: 11, fontWeight: '700' },

  gymTimingCard: { backgroundColor: P.card, borderWidth: 1, borderColor: P.cardBorder, borderRadius: 14, overflow: 'hidden' },
  timingRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  timingRowBorder: { borderBottomWidth: 1, borderBottomColor: P.cardBorder },
  timingDay: { color: P.white, fontSize: 13, fontWeight: '600', flex: 1 },
  timingTime: { color: P.textMuted, fontSize: 12 },
  timingPeak: { color: P.warning, fontSize: 11, fontWeight: '700' },

  // Attendance
  monthChip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: P.card, borderWidth: 1, borderColor: P.cardBorder },
  monthChipActive: { backgroundColor: P.red, borderColor: P.red },
  monthChipText: { color: P.textMuted, fontSize: 13, fontWeight: '600' },
  monthChipTextActive: { color: P.white },

  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, backgroundColor: P.card, borderWidth: 1, borderColor: P.cardBorder, borderRadius: 14, padding: 14, alignItems: 'center' },
  statNum: { color: P.white, fontSize: 22, fontWeight: '900' },
  statLabel: { color: P.textMuted, fontSize: 11, marginTop: 4 },

  attendanceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: P.card, borderWidth: 1, borderColor: P.cardBorder, borderRadius: 14, padding: 14, marginBottom: 10, gap: 12 },
  attendanceDateBox: { width: 44, height: 50, borderRadius: 10, backgroundColor: 'rgba(255,23,57,0.12)', justifyContent: 'center', alignItems: 'center' },
  attendanceDateDay: { color: P.white, fontSize: 18, fontWeight: '900' },
  attendanceDateMon: { color: P.red, fontSize: 10, fontWeight: '700' },
  attendanceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  attendanceTimeLabel: { color: P.textMuted, fontSize: 12 },
  attendanceTimeVal: { color: P.white, fontSize: 12, fontWeight: '600' },
  attendanceDuration: { color: P.textFaint, fontSize: 11, marginTop: 3 },
  attendanceStatusPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  attendanceStatusText: { fontSize: 11, fontWeight: '700' },

  emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { color: P.textMuted, fontSize: 14, textAlign: 'center' },

  // Plans
  activePlanBanner: { borderRadius: 16, padding: 18, borderWidth: 1, borderColor: 'rgba(255,23,57,0.25)' },
  activePlanRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  activePlanLabel: { color: P.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 4 },
  activePlanName: { color: P.white, fontSize: 18, fontWeight: '900' },
  activePlanSub: { color: P.textMuted, fontSize: 12, marginTop: 3 },
  activePlanStatusBadge: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  activePlanStatusText: { fontSize: 12, fontWeight: '700' },
  activePlanAmountRow: { flexDirection: 'row', gap: 24 },
  activePlanAmountLabel: { color: P.textFaint, fontSize: 10, fontWeight: '600', letterSpacing: 1, marginBottom: 2 },
  activePlanAmountVal: { color: P.white, fontSize: 15, fontWeight: '700' },

  planTabChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: P.card, borderWidth: 1, borderColor: P.cardBorder },
  planTabChipActive: { backgroundColor: 'rgba(255,53,85,0.22)', borderColor: '#FF3555' },
  planTabChipText: { color: P.textMuted, fontSize: 13, fontWeight: '600' },
  planTabChipTextActive: { color: '#FF4D6D', fontWeight: '800' },

  planCard: { backgroundColor: P.card, borderWidth: 1, borderColor: P.cardBorder, borderRadius: 14, padding: 14, marginBottom: 10 },
  planCardCurrent: { borderColor: '#FF3555', backgroundColor: 'rgba(255,53,85,0.12)' },
  planCardCurrentBadge: { backgroundColor: '#FF3555', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 8 },
  planCardCurrentBadgeText: { color: P.white, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  planCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planCardName: { color: P.white, fontSize: 14, fontWeight: '700' },
  planCardDur: { color: P.textMuted, fontSize: 12, marginTop: 3 },
  planCardPrice: { color: P.red, fontSize: 18, fontWeight: '900' },
  planExpandRow: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: P.cardBorder },
  planExpandTitle: { color: P.white, fontSize: 13, fontWeight: '700', marginBottom: 4 },
  planExpandItem: { color: P.textMuted, fontSize: 12, lineHeight: 20 },

  // ID Card
  cardModeBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: P.card, borderWidth: 1, borderColor: P.cardBorder, alignItems: 'center' },
  cardModeBtnActive: { backgroundColor: 'rgba(255,23,57,0.15)', borderColor: P.red },
  cardModeBtnText: { color: P.textMuted, fontSize: 12, fontWeight: '600' },
  cardModeBtnTextActive: { color: P.red, fontWeight: '700' },

  // Classic Card
  classicCard: { width: SCREEN_W - 40, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: '#0D0D0D' },
  classicTopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#161616',
    borderTopWidth: 3,
    borderTopColor: '#FF3555',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  classicGymName: { color: P.white, fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
  classicCardLabel: { color: '#FF3555', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  classicHeaderPill: {
    backgroundColor: 'rgba(255,53,85,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,53,85,0.3)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  classicHeaderPillText: { color: '#FF3555', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  classicBody: { flexDirection: 'row', padding: 16, gap: 4 },
  classicPhotoSection: { alignItems: 'center' },
  classicPhoto: { width: 80, height: 96, borderRadius: 8, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center' },
  classicPhotoPlaceholder: { backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center' },
  classicIdBadge: { marginTop: 6, backgroundColor: 'rgba(255,23,57,0.2)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  classicIdText: { color: P.red, fontSize: 11, fontWeight: '800' },
  classicMemberName: { color: P.white, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  classicPlanBadge: { color: P.red, fontSize: 11, fontWeight: '700', marginBottom: 8 },
  classicInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  classicInfoText: { color: P.textMuted, fontSize: 11 },
  classicFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  classicFooterLabel: { color: P.textMuted, fontSize: 10, letterSpacing: 1 },
  classicFooterValue: { color: P.white, fontSize: 13, fontWeight: '700', marginTop: 2 },
  classicBarcode: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  classicBarcodeBar: { height: 28, borderRadius: 1 },

  // Pro Card
  proCard: { width: SCREEN_W - 40, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  proTopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,53,85,0.25)',
  },
  proGymName: { color: P.white, fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
  proVipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,53,85,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,53,85,0.4)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  proVipPillText: { color: P.white, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  proBody: { flexDirection: 'row', padding: 16, alignItems: 'center' },
  proPhotoWrap: { position: 'relative' },
  proPhoto: { width: 72, height: 86, borderRadius: 10, backgroundColor: '#222' },
  proBadge: { position: 'absolute', bottom: -8, left: 0, right: 0, borderRadius: 6, paddingVertical: 4, alignItems: 'center' },
  proBadgeText: { color: P.white, fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  proName: { color: P.white, fontSize: 16, fontWeight: '800', marginBottom: 4 },
  proIdText: { color: P.red, fontSize: 12, fontWeight: '700' },
  proMobile: { color: P.textMuted, fontSize: 12, marginTop: 3 },
  proDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 16 },
  proInfoGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12 },
  proInfoItem: { width: (SCREEN_W - 40 - 32 - 12) / 2 },
  proInfoLabel: { color: P.textFaint, fontSize: 9, letterSpacing: 1.5, fontWeight: '700', marginBottom: 2 },
  proInfoValue: { color: P.white, fontSize: 12, fontWeight: '600' },

  // Modern Card
  modernCard: { width: SCREEN_W - 40, borderRadius: 18, position: 'relative' },
  modernNeonBorder: { position: 'absolute', inset: 0, borderRadius: 18, borderWidth: 1.5, borderColor: P.red, shadowColor: P.red, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 12, elevation: 0 },
  modernInner: { borderRadius: 18, padding: 20, overflow: 'hidden' },
  modernTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  modernGymTag: { color: P.red, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 4 },
  modernTitle: { color: P.white, fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  modernPhoto: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: P.red },
  modernName: { color: P.white, fontSize: 22, fontWeight: '900', letterSpacing: 0.5, marginBottom: 10 },
  modernPlanRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  modernPlanBadge: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  modernPlanBadgeText: { color: P.white, fontSize: 11, fontWeight: '800' },
  modernId: { color: P.textMuted, fontSize: 13, fontWeight: '700' },
  modernDivider: { height: 1, backgroundColor: 'rgba(255,23,57,0.25)', marginBottom: 14 },
  modernDataRow: { flexDirection: 'row', justifyContent: 'space-between' },
  modernDataLabel: { color: P.textFaint, fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginBottom: 3 },
  modernDataValue: { color: P.white, fontSize: 12, fontWeight: '600' },
  modernCyberStrip: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, marginTop: 16, height: 20 },
  modernCyberLine: { width: 3, borderRadius: 2, backgroundColor: P.red },

  // Profile
  profileAvatarSection: { alignItems: 'center', paddingVertical: 28, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  profileAvatarWrap: { position: 'relative', marginBottom: 14 },
  profileAvatar: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center' },
  profileStatusDot: { position: 'absolute', right: 4, bottom: 4, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: P.bg },
  profileName: { color: P.white, fontSize: 20, fontWeight: '800', marginBottom: 4 },
  profileEmail: { color: P.textMuted, fontSize: 13 },
  profileMemberBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: 'rgba(255,23,57,0.1)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  profileMemberBadgeText: { color: P.red, fontSize: 11, fontWeight: '700', letterSpacing: 1 },

  profileRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: P.card, borderWidth: 1, borderColor: P.cardBorder, borderRadius: 12, padding: 14, marginBottom: 8 },
  profileRowLabel: { color: P.textFaint, fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginBottom: 3 },
  profileRowValue: { color: P.white, fontSize: 13, fontWeight: '500' },

  guestProfileBox: { alignItems: 'center', paddingVertical: 40, gap: 14 },
  guestProfileTitle: { color: P.white, fontSize: 18, fontWeight: '800' },
  guestProfileSub: { color: P.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 20, paddingHorizontal: 10 },
  guestEnrollBtn: { borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 },
  guestEnrollText: { color: P.white, fontSize: 14, fontWeight: '700' },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,23,57,0.3)', backgroundColor: 'rgba(255,23,57,0.07)' },
  logoutText: { color: P.red, fontSize: 15, fontWeight: '700' },
});

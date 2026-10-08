import { useEffect, useState } from 'react';
import { Alert, Linking, Modal, Pressable, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PALETTE } from '../theme/darkPalette';
import { Member } from '../services/member.service';
import { getBusinessProfile } from '../services/businessProfile.service';
import { formatDate } from '../utils/date';

interface Props {
  visible: boolean;
  member: Member | null;
  planName?: string;
  startDate?: Date | null;
  expiryDate?: string | Date | null;
  paidAmount?: number;
  dueAmount?: number;
  onDone: () => void;
}

export default function WhatsappRenewModal({
  visible,
  member,
  planName,
  startDate,
  expiryDate,
  paidAmount,
  dueAmount,
  onDone,
}: Props) {
  const [sending, setSending] = useState(false);
  const [businessName, setBusinessName] = useState('A2 Pro Fitness');
  const [businessPhone, setBusinessPhone] = useState('');

  useEffect(() => {
    getBusinessProfile()
      .then((profile) => {
        if (profile.businessName) setBusinessName(profile.businessName);
        if (profile.phone) setBusinessPhone(profile.phone);
      })
      .catch(() => {});
  }, []);

  if (!member) return null;

  const displayPlanName =
    planName ||
    (typeof member.planId === 'object' && member.planId ? member.planId.name : null) ||
    'Gym Membership';
  const displayStartDate = startDate ? formatDate(startDate) : (member.joiningDate ? formatDate(member.joiningDate) : '-');
  const displayExpiryDate = expiryDate
    ? formatDate(expiryDate)
    : member.planExpiryDate
    ? formatDate(member.planExpiryDate)
    : '-';
  const displayPaid = paidAmount ?? member.paidAmount ?? 0;
  const displayDue = dueAmount ?? member.dueAmount ?? 0;

  const handleSend = async () => {
    setSending(true);
    try {
      const message =
        `Hello ${member.name},\n\n` +
        `Your membership plan has been successfully renewed! 🎉\n\n` +
        `--- Plan Renewal Details ---\n` +
        `Gym: ${businessName}\n` +
        `Membership ID: ${member.membershipId}\n` +
        `Plan: ${displayPlanName}\n` +
        `Start Date: ${displayStartDate}\n` +
        `Valid Till: ${displayExpiryDate}\n` +
        `Amount Paid: Rs ${displayPaid}\n` +
        `Due Amount: Rs ${displayDue}\n` +
        (businessPhone ? `\nFor any queries, contact us at ${businessPhone}.\n` : '\n') +
        `Thank you for staying fit with us! See you at the gym! 💪`;

      const url = `https://wa.me/91${member.mobile}?text=${encodeURIComponent(message)}`;
      await Linking.openURL(url);
      onDone();
    } catch (err: any) {
      Alert.alert('Could not open WhatsApp', err?.message || 'Something went wrong');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onDone}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Ionicons name="logo-whatsapp" size={44} color={PALETTE.success} style={{ marginBottom: 10 }} />
          <Text style={styles.title}>Plan Renewed Successfully!</Text>
          <Text style={styles.subtitle}>
            Send membership renewal details to {member.name} on WhatsApp.
          </Text>

          <View style={styles.readOnlyRow}>
            <Ionicons name="person-outline" size={16} color={PALETTE.textMuted} style={{ marginRight: 8 }} />
            <Text style={styles.readOnlyText} numberOfLines={1}>{member.name} (MID: {member.membershipId})</Text>
          </View>
          <View style={styles.readOnlyRow}>
            <Ionicons name="call-outline" size={16} color={PALETTE.textMuted} style={{ marginRight: 8 }} />
            <Text style={styles.readOnlyText}>+91 {member.mobile}</Text>
          </View>
          <View style={styles.readOnlyRow}>
            <Ionicons name="barbell-outline" size={16} color={PALETTE.textMuted} style={{ marginRight: 8 }} />
            <Text style={styles.readOnlyText} numberOfLines={1}>Plan: {displayPlanName}</Text>
          </View>
          <View style={styles.readOnlyRow}>
            <Ionicons name="calendar-outline" size={16} color={PALETTE.textMuted} style={{ marginRight: 8 }} />
            <Text style={styles.readOnlyText} numberOfLines={1}>Validity: {displayStartDate} to {displayExpiryDate}</Text>
          </View>

          <Pressable onPress={handleSend} disabled={sending} style={{ width: '100%' }}>
            <LinearGradient
              colors={[PALETTE.redSoft, PALETTE.red, PALETTE.redDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cta}
            >
              {sending ? (
                <ActivityIndicator color={PALETTE.white} />
              ) : (
                <View style={styles.ctaContent}>
                  <Ionicons name="logo-whatsapp" size={20} color={PALETTE.white} style={{ marginRight: 8 }} />
                  <Text style={styles.ctaText}>SEND VIA WHATSAPP</Text>
                </View>
              )}
            </LinearGradient>
          </Pressable>

          <Pressable onPress={onDone} style={styles.skipBtn} hitSlop={8}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0A0A0D',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: PALETTE.surfaceBorder,
    padding: 22,
    alignItems: 'center',
  },
  title: { color: PALETTE.white, fontSize: 18, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  subtitle: { color: PALETTE.textMuted, fontSize: 13, textAlign: 'center', marginBottom: 16, lineHeight: 18 },
  readOnlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: PALETTE.inputBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10,
  },
  readOnlyText: { color: PALETTE.textMuted, fontSize: 14, flex: 1 },
  cta: {
    alignSelf: 'stretch',
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { color: PALETTE.white, fontSize: 14, fontWeight: '800', letterSpacing: 1.5 },
  skipBtn: { marginTop: 14 },
  skipText: { color: PALETTE.textMuted, fontSize: 13, fontWeight: '600' },
});

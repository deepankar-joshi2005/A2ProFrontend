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
  password: string;
  onDone: () => void;
}

export default function WhatsappOnboardingModal({ visible, member, password, onDone }: Props) {
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

  const handleSend = async () => {
    setSending(true);
    try {
      const message =
        `Hello ${member.name},\n\n` +
        `Welcome to the gym! Your membership is now active.\n\n` +
        `--- Membership Details ---\n` +
        `Gym: ${businessName}\n` +
        `Plan: ${member.planId?.name || '-'}\n` +
        `Start Date: ${formatDate(member.joiningDate)}\n` +
        `Valid Till: ${member.planExpiryDate ? formatDate(member.planExpiryDate) : '-'}\n` +
        `Amount Paid: Rs ${member.paidAmount}\n` +
        (businessPhone ? `\nFor any queries, contact us at ${businessPhone}.\n` : '\n') +
        `\n--- App Login Details ---\n` +
        `Login to our app with the credentials below to view your membership, workout & diet plans, and more:\n` +
        `Email: ${member.email}\n` +
        `Password: ${password}\n\n` +
        `Keep this information safe. See you at the gym!`;
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
          <Ionicons name="logo-whatsapp" size={40} color={PALETTE.success} style={{ marginBottom: 12 }} />
          <Text style={styles.title}>Member Registered</Text>
          <Text style={styles.subtitle}>
            Send {member.name}'s app login details to them on WhatsApp.
          </Text>

          <View style={styles.readOnlyRow}>
            <Ionicons name="mail-outline" size={16} color={PALETTE.textMuted} style={{ marginRight: 8 }} />
            <Text style={styles.readOnlyText}>{member.email}</Text>
          </View>
          <View style={styles.readOnlyRow}>
            <Ionicons name="call-outline" size={16} color={PALETTE.textMuted} style={{ marginRight: 8 }} />
            <Text style={styles.readOnlyText}>+91 {member.mobile}</Text>
          </View>
          <View style={styles.readOnlyRow}>
            <Ionicons name="lock-closed-outline" size={16} color={PALETTE.textMuted} style={{ marginRight: 8 }} />
            <Text style={styles.readOnlyText}>{password}</Text>
          </View>

          <Pressable onPress={handleSend} disabled={sending}>
            <LinearGradient
              colors={[PALETTE.redSoft, PALETTE.red, PALETTE.redDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cta}
            >
              {sending ? (
                <ActivityIndicator color={PALETTE.white} />
              ) : (
                <Text style={styles.ctaText}>SEND VIA WHATSAPP</Text>
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
  title: { color: PALETTE.white, fontSize: 18, fontWeight: '800', marginBottom: 6 },
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
  readOnlyText: { color: PALETTE.textMuted, fontSize: 14 },
  cta: {
    alignSelf: 'stretch',
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  ctaText: { color: PALETTE.white, fontSize: 14, fontWeight: '800', letterSpacing: 1.5 },
  skipBtn: { marginTop: 14 },
  skipText: { color: PALETTE.textMuted, fontSize: 13, fontWeight: '600' },
});

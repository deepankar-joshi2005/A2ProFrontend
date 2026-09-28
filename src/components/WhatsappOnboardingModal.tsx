import { useState } from 'react';
import { Alert, Linking, Modal, Pressable, Text, TextInput, View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PALETTE } from '../theme/darkPalette';
import { isValidPassword } from '../utils/validation';
import { createMemberAccount, Member } from '../services/member.service';

interface Props {
  visible: boolean;
  member: Member | null;
  onDone: () => void;
}

export default function WhatsappOnboardingModal({ visible, member, onDone }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  if (!member) return null;

  const handleSend = async () => {
    if (!isValidPassword(password)) {
      setError('Password must be at least 6 characters');
      return;
    }
    setSending(true);
    try {
      await createMemberAccount(member._id, password);
      const message =
        `Hi ${member.name}, you have been registered in A2 Pro Fitness! ` +
        `Login to our app with:\nEmail: ${member.email}\nPassword: ${password}`;
      const url = `https://wa.me/91${member.mobile}?text=${encodeURIComponent(message)}`;
      await Linking.openURL(url);
      onDone();
    } catch (err: any) {
      Alert.alert('Could not create account', err?.response?.data?.message || 'Something went wrong');
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
            Set a password to activate {member.name}'s app login and send it to them on WhatsApp.
          </Text>

          <View style={styles.readOnlyRow}>
            <Ionicons name="mail-outline" size={16} color={PALETTE.textMuted} style={{ marginRight: 8 }} />
            <Text style={styles.readOnlyText}>{member.email}</Text>
          </View>
          <View style={styles.readOnlyRow}>
            <Ionicons name="call-outline" size={16} color={PALETTE.textMuted} style={{ marginRight: 8 }} />
            <Text style={styles.readOnlyText}>+91 {member.mobile}</Text>
          </View>

          <View style={[styles.inputWrap, !!error && { borderColor: PALETTE.error }]}>
            <Ionicons name="lock-closed-outline" size={16} color={PALETTE.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.input}
              placeholder="Set a password"
              placeholderTextColor={PALETTE.textFaint}
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (error) setError('');
              }}
              secureTextEntry
            />
          </View>
          {!!error && <Text style={styles.errorText}>{error}</Text>}

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
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: PALETTE.inputBg,
    borderWidth: 1,
    borderColor: PALETTE.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginTop: 6,
  },
  input: { flex: 1, color: PALETTE.white, fontSize: 14 },
  errorText: { color: PALETTE.error, fontSize: 12, alignSelf: 'flex-start', marginTop: 6 },
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

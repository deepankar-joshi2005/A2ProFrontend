import { useEffect, useState } from 'react';
import { View, Text, Pressable, Modal, Image, Share, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatDate } from '../utils/date';
import { Member } from '../services/member.service';
import { getBusinessProfile } from '../services/businessProfile.service';
import { useTheme } from '../context/ThemeContext';

interface Props {
  member: Member | null;
  visible: boolean;
  onClose: () => void;
}

export default function IdCardModal({ member, visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { isDark, palette } = useTheme();
  const [passTemplate, setPassTemplate] = useState<'modern' | 'classic' | 'bold'>('modern');
  const [businessName, setBusinessName] = useState('Fitness Pro');
  const [ownerLine, setOwnerLine] = useState('');

  useEffect(() => {
    getBusinessProfile()
      .then((profile) => {
        if (profile.businessName) setBusinessName(profile.businessName);
        const parts = [profile.contactPerson, profile.phone ? `(+${profile.phone})` : ''].filter(Boolean);
        setOwnerLine(parts.join(' '));
      })
      .catch(() => {});
  }, []);

  const isClassic = passTemplate === 'classic';
  const isBold = passTemplate === 'bold';

  const passCardBgColor = isClassic ? (isDark ? '#1E293B' : '#FFFFFF') : isBold ? '#0F172A' : '#006666';
  const passPrimaryTextColor = isClassic ? (isDark ? '#FFFFFF' : '#0F172A') : '#FFFFFF';
  const passSecondaryTextColor = isClassic ? (isDark ? '#94A3B8' : '#475569') : 'rgba(255,255,255,0.85)';
  const passLabelColor = isClassic ? (isDark ? '#38BDF8' : '#006666') : isBold ? '#38BDF8' : 'rgba(255,255,255,0.7)';

  const handleShare = () => {
    if (!member) return;
    Share.share({
      message: `${businessName} - Gym Pass\n${member.name} (ID: ${member.membershipId})\nPlan: ${member.planId?.name || 'No active plan'}\nExpiry: ${member.planExpiryDate ? formatDate(member.planExpiryDate) : '-'}`,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View
          style={[
            styles.passModalContent,
            { backgroundColor: palette.sheetBg, borderColor: palette.surfaceBorder, marginBottom: insets.bottom || 10 },
          ]}
        >
          <View style={styles.passModalHandle} />

          <View style={styles.passModalHeader}>
            <Text style={[styles.passModalTitle, { color: palette.text }]}>Gym Pass</Text>
            <Pressable onPress={onClose} hitSlop={12} style={styles.passCloseIconBtn}>
              <Ionicons name="close" size={22} color={palette.textMuted} />
            </Pressable>
          </View>

          <View style={[styles.passTemplateRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#EEF2F6' }]}>
            {(['modern', 'classic', 'bold'] as const).map((t) => (
              <Pressable
                key={t}
                style={[styles.passTemplateBtn, passTemplate === t && styles.passTemplateBtnActive]}
                onPress={() => setPassTemplate(t)}
              >
                <Text style={[styles.passTemplateText, { color: palette.textMuted }, passTemplate === t && styles.passTemplateTextActive]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          {member && (
            <View
              style={[
                styles.passCard,
                { backgroundColor: passCardBgColor },
                isClassic && { borderColor: '#006666', borderWidth: 2 },
                isBold && { borderColor: '#3B82F6', borderWidth: 1.5 },
              ]}
            >
              <View style={styles.passBanner}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.passGymName, { color: passPrimaryTextColor }]}>{businessName}</Text>
                  {!!ownerLine && (
                    <Text style={[styles.passOwnerName, { color: passSecondaryTextColor }]}>{ownerLine}</Text>
                  )}
                </View>
                <View style={[styles.passGymLogoCircle, { backgroundColor: isClassic ? '#006666' : '#FFFFFF' }]}>
                  <Ionicons name="people" size={18} color={isClassic ? '#FFFFFF' : '#006666'} />
                </View>
              </View>

              <View style={styles.passMemberRow}>
                <View style={[styles.passAvatarCircle, { borderColor: isClassic ? '#006666' : 'rgba(255,255,255,0.4)' }]}>
                  {member.photoUrl ? (
                    <Image source={{ uri: member.photoUrl }} style={styles.passAvatarImage} />
                  ) : (
                    <Ionicons name="person" size={32} color="#006666" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.passMemberName, { color: passPrimaryTextColor }]}>{member.name}</Text>
                  <Text style={[styles.passMemberId, { color: passSecondaryTextColor }]}>ID: {member.membershipId}</Text>
                </View>
              </View>

              <View style={[styles.passDivider, { backgroundColor: isClassic ? 'rgba(0,102,102,0.2)' : 'rgba(255,255,255,0.2)' }]} />

              <View style={styles.passDetailsGrid}>
                <View style={styles.passDetailCol}>
                  <Text style={[styles.passLabel, { color: passLabelColor }]}>PLAN</Text>
                  <Text style={[styles.passValueBold, { color: passPrimaryTextColor }]}>
                    {member.planId?.name || 'No active plan'}
                  </Text>
                </View>
                <View style={[styles.passDetailCol, { alignItems: 'flex-end' }]}>
                  <Text style={[styles.passLabel, { color: passLabelColor }]}>START</Text>
                  <Text style={[styles.passValueBold, { color: passPrimaryTextColor }]}>{formatDate(member.joiningDate)}</Text>
                </View>
                <View style={[styles.passDetailCol, { alignItems: 'flex-end', marginTop: 10 }]}>
                  <Text style={[styles.passLabel, { color: passLabelColor }]}>EXPIRY</Text>
                  <Text style={[styles.passValueBold, { color: passPrimaryTextColor }]}>
                    {member.planExpiryDate ? formatDate(member.planExpiryDate) : '-'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          <Pressable style={styles.passShareBtn} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
            <Text style={styles.passShareBtnText}>Share</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
  modalBackdrop: { flex: 1 },
  passModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
    alignItems: 'center',
    marginHorizontal: 10,
    borderRadius: 24,
    borderWidth: 1,
    elevation: 10,
  },
  passModalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#CCCCCC', marginBottom: 10 },
  passModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 14 },
  passModalTitle: { fontSize: 19, fontWeight: '900' },
  passCloseIconBtn: { padding: 4 },
  passTemplateRow: { flexDirection: 'row', width: '100%', borderRadius: 14, padding: 4, marginBottom: 16 },
  passTemplateBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  passTemplateBtnActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  passTemplateText: { fontSize: 13, fontWeight: '600' },
  passTemplateTextActive: { color: '#006666', fontWeight: '800' },

  passCard: { width: '100%', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  passBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  passGymName: { fontSize: 18, fontWeight: '900' },
  passOwnerName: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  passGymLogoCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  passMemberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  passAvatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
  },
  passAvatarImage: { width: '100%', height: '100%' },
  passMemberName: { fontSize: 18, fontWeight: '900' },
  passMemberId: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  passDivider: { height: 1, marginBottom: 12 },
  passDetailsGrid: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' },
  passDetailCol: { minWidth: '45%' },
  passLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  passValueBold: { fontSize: 14, fontWeight: '800', marginTop: 2 },

  passShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#006666',
    borderRadius: 14,
    width: '100%',
    height: 48,
    marginTop: 16,
  },
  passShareBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});

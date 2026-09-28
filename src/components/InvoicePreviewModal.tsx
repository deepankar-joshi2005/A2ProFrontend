import { useEffect, useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, Share, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { formatDate } from '../utils/date';
import { Member } from '../services/member.service';
import { Payment } from '../services/payment.service';
import { getBusinessProfile, BusinessProfile } from '../services/businessProfile.service';

interface Props {
  visible: boolean;
  member: Member;
  payment: Payment;
  allPayments: Payment[];
  onClose: () => void;
}

const formatINR = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

export default function InvoicePreviewModal({ visible, member, payment, allPayments, onClose }: Props) {
  const { palette } = useTheme();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);

  useEffect(() => {
    if (visible) {
      getBusinessProfile().then(setProfile).catch(() => {});
    }
  }, [visible]);

  const totalPaidAllInvoices = allPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalPlanCost = member.planAmount || 0;
  const totalDue = Math.max(0, totalPlanCost - totalPaidAllInvoices);

  const handleShare = () => {
    Share.share({
      message:
        `${profile?.businessName || 'Fitness Pro'} - Invoice ${payment.invoiceNumber}\n` +
        `Billed To: ${member.name} (+${member.countryCode}-${member.mobile})\n` +
        `Plan: ${member.planId?.name || '-'} | ${formatDate(member.joiningDate)} - ${member.planExpiryDate ? formatDate(member.planExpiryDate) : '-'}\n` +
        `This Payment: ${formatINR(payment.amount)}\n` +
        `Total Plan Cost: ${formatINR(totalPlanCost)}\n` +
        `Total Paid: ${formatINR(totalPaidAllInvoices)}\n` +
        `Total Due: ${formatINR(totalDue)}`,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.card, { backgroundColor: palette.sheetBg, borderColor: palette.surfaceBorder }]}>
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: palette.text }]}>Invoice Preview</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={palette.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 480 }} contentContainerStyle={{ paddingBottom: 8 }}>
            <View style={styles.invoiceTopRow}>
              <View>
                <Text style={[styles.businessName, { color: palette.accent }]}>{profile?.businessName || 'Fitness Pro'}</Text>
                {!!profile?.contactPerson && <Text style={{ color: palette.textMuted, fontSize: 12 }}>{profile.contactPerson}</Text>}
                {!!profile?.phone && <Text style={{ color: palette.textMuted, fontSize: 12 }}>Contact: +{profile.phone}</Text>}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.invoiceLabel, { color: palette.text }]}>INVOICE</Text>
                <Text style={{ color: palette.textMuted, fontSize: 12 }}>#{payment.invoiceNumber}</Text>
                <Text style={{ color: palette.textMuted, fontSize: 12 }}>{formatDate(payment.date)}</Text>
              </View>
            </View>

            <View style={[styles.billedBox, { backgroundColor: palette.inputBg }]}>
              <Text style={[styles.sectionLabel, { color: palette.accent }]}>BILLED TO</Text>
              <View style={styles.billedRow}>
                <View>
                  <Text style={{ color: palette.text, fontWeight: '800' }}>{member.name}</Text>
                  <Text style={{ color: palette.textMuted, fontSize: 12 }}>+{member.countryCode}-{member.mobile}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: palette.textMuted, fontSize: 11 }}>Plan Start: {formatDate(member.joiningDate)}</Text>
                  <Text style={{ color: palette.textMuted, fontSize: 11 }}>
                    Plan End: {member.planExpiryDate ? formatDate(member.planExpiryDate) : '-'}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={[styles.sectionLabel, { color: palette.accent, marginTop: 16 }]}>PLAN DETAILS</Text>
            <View style={[styles.table, { borderColor: palette.surfaceBorder }]}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.th, { color: palette.textMuted, flex: 1.4 }]}>Plan</Text>
                <Text style={[styles.th, { color: palette.textMuted, flex: 1 }]}>Start</Text>
                <Text style={[styles.th, { color: palette.textMuted, flex: 1 }]}>End</Text>
                <Text style={[styles.th, { color: palette.textMuted, flex: 1, textAlign: 'right' }]}>Amount</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.td, { color: palette.text, flex: 1.4 }]}>{member.planId?.name || '-'}</Text>
                <Text style={[styles.td, { color: palette.text, flex: 1 }]}>{formatDate(member.joiningDate)}</Text>
                <Text style={[styles.td, { color: palette.text, flex: 1 }]}>
                  {member.planExpiryDate ? formatDate(member.planExpiryDate) : '-'}
                </Text>
                <Text style={[styles.td, { color: palette.text, flex: 1, textAlign: 'right' }]}>{formatINR(totalPlanCost)}</Text>
              </View>
            </View>

            <Text style={[styles.sectionLabel, { color: palette.accent, marginTop: 16 }]}>PAYMENT SUMMARY</Text>
            <SummaryRow label="Total Plan Cost:" value={formatINR(totalPlanCost)} palette={palette} />
            <SummaryRow label={`This Payment (Invoice #${payment.invoiceNumber}):`} value={formatINR(payment.amount)} palette={palette} />
            <SummaryRow label="Total Paid (all invoices):" value={formatINR(totalPaidAllInvoices)} palette={palette} />
            <SummaryRow label="Total Due:" value={formatINR(totalDue)} palette={palette} valueColor={totalDue > 0 ? '#DC2626' : undefined} bold />

            <Text style={[styles.sectionLabel, { color: palette.accent, marginTop: 16 }]}>REFUND POLICY</Text>
            <Text style={[styles.smallPrint, { color: palette.textMuted }]}>
              All payments are final. No refunds will be issued once payment is processed.
            </Text>

            <Text style={[styles.sectionLabel, { color: palette.accent, marginTop: 12 }]}>TERMS & CONDITIONS</Text>
            <Text style={[styles.smallPrint, { color: palette.textMuted }]}>
              Membership is non-transferable. Gym rules must be followed at all times.
            </Text>

            <Text style={{ textAlign: 'center', color: palette.textMuted, fontSize: 12, marginTop: 16 }}>
              Thank you for choosing {profile?.businessName || 'Fitness Pro'}
            </Text>
            <Text style={{ textAlign: 'center', color: palette.textFaint, fontSize: 10, marginTop: 4 }}>
              Invoice generated on {new Date().toLocaleDateString()}
            </Text>
          </ScrollView>

          <Pressable style={[styles.shareBtn, { backgroundColor: palette.accent }]} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
            <Text style={styles.shareBtnText}>Share Invoice</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function SummaryRow({
  label,
  value,
  palette,
  bold,
  valueColor,
}: {
  label: string;
  value: string;
  palette: any;
  bold?: boolean;
  valueColor?: string;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={{ color: bold ? palette.text : palette.textMuted, fontWeight: bold ? '800' : '500', fontSize: 13 }}>{label}</Text>
      <Text style={{ color: valueColor || palette.text, fontWeight: '800', fontSize: 13 }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 420, borderRadius: 18, borderWidth: 1, padding: 18 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  invoiceTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  businessName: { fontSize: 18, fontWeight: '900' },
  invoiceLabel: { fontSize: 16, fontWeight: '900' },
  billedBox: { borderRadius: 12, padding: 12, marginTop: 16 },
  billedRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  table: { borderWidth: 1, borderRadius: 10, marginTop: 8, overflow: 'hidden' },
  tableHeaderRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 10, backgroundColor: 'rgba(0,0,0,0.03)' },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 10 },
  th: { fontSize: 11, fontWeight: '700' },
  td: { fontSize: 12, fontWeight: '600' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  smallPrint: { fontSize: 11, lineHeight: 16, marginTop: 6 },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 14,
    marginTop: 16,
  },
  shareBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
});

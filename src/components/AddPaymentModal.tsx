import { useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import DateInputField from './DateInputField';
import OptionSheet, { SheetOption } from './OptionSheet';

interface Props {
  visible: boolean;
  dueAmount: number;
  onClose: () => void;
  onSubmit: (input: { amount: number; method: string; date: string }) => Promise<void>;
}

const PAYMENT_METHODS: SheetOption[] = [
  { label: 'Cash', value: 'Cash' },
  { label: 'Card', value: 'Card' },
  { label: 'UPI', value: 'UPI' },
  { label: 'Bank Transfer', value: 'Bank Transfer' },
  { label: 'Other', value: 'Other' },
];

export default function AddPaymentModal({ visible, dueAmount, onClose, onSubmit }: Props) {
  const { palette } = useTheme();
  const [date, setDate] = useState<Date>(new Date());
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [methodPickerVisible, setMethodPickerVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    const value = Number(amount);
    if (!value || value <= 0) {
      Alert.alert('Required', 'Enter a valid amount.');
      return;
    }
    if (value > dueAmount) {
      Alert.alert('Too much', `Amount can't exceed the due amount of ₹${dueAmount}.`);
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ amount: value, method, date: date.toISOString() });
      setAmount('');
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not add payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.card, { backgroundColor: palette.sheetBg, borderColor: palette.surfaceBorder }]}>
          <Text style={[styles.title, { color: palette.text }]}>Add Payment</Text>

          <DateInputField icon="calendar-outline" placeholder="Payment Date" value={date} onChange={setDate} />

          <View style={[styles.inputWrap, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, marginTop: 12 }]}>
            <Ionicons name="cash-outline" size={18} color={palette.textMuted} style={{ marginRight: 10 }} />
            <TextInput
              style={[styles.input, { color: palette.text }]}
              placeholder={`Amount Paid (Due: ₹${dueAmount})`}
              placeholderTextColor={palette.textFaint}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
          </View>

          <Pressable
            style={[styles.inputWrap, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, marginTop: 12 }]}
            onPress={() => setMethodPickerVisible(true)}
          >
            <Ionicons name="card-outline" size={18} color={palette.textMuted} style={{ marginRight: 10 }} />
            <Text style={{ color: palette.text, fontSize: 15 }}>{method || 'Select Payment Method'}</Text>
          </Pressable>

          <View style={styles.actionsRow}>
            <Pressable style={[styles.btn, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, borderWidth: 1 }]} onPress={onClose}>
              <Text style={{ color: palette.text, fontWeight: '700' }}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.btn, { backgroundColor: palette.accent }]} onPress={handleAdd} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Add</Text>}
            </Pressable>
          </View>
        </View>
      </View>

      <OptionSheet
        visible={methodPickerVisible}
        title="Payment Method"
        options={PAYMENT_METHODS}
        selectedValue={method}
        onSelect={setMethod}
        onClose={() => setMethodPickerVisible(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 380, borderRadius: 18, borderWidth: 1, padding: 20 },
  title: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, height: 52 },
  input: { flex: 1, fontSize: 15 },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  btn: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});

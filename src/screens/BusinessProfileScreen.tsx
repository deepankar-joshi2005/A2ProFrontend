import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { getBusinessProfile, saveBusinessProfile } from '../services/businessProfile.service';

interface Props {
  onBack: () => void;
}

export default function BusinessProfileScreen({ onBack }: Props) {
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    getBusinessProfile()
      .then((p) => {
        setBusinessName(p.businessName || '');
        setContactPerson(p.contactPerson || '');
        setPhone(p.phone || '');
        setAddress(p.address || '');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!businessName.trim()) {
      Alert.alert('Required', 'Please enter a business name.');
      return;
    }
    setSaving(true);
    try {
      await saveBusinessProfile({ businessName: businessName.trim(), contactPerson: contactPerson.trim(), phone: phone.trim(), address: address.trim() });
      Alert.alert('Saved', 'Business profile updated. It will now show on invoices and ID cards.');
      onBack();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not save business profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.root, { backgroundColor: palette.background, paddingTop: insets.top }]}>
        <StatusBar style="light" />

        <View style={[styles.topBar, { backgroundColor: palette.topBarBg }]}>
          <Pressable onPress={onBack} hitSlop={8} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={palette.topBarText} />
          </Pressable>
          <Text style={[styles.topTitle, { color: palette.topBarText }]}>Business Profile</Text>
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={palette.accent} />
          </View>
        ) : (
          <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 40 }}>
            <Text style={{ color: palette.textMuted, fontSize: 12.5, marginBottom: 16 }}>
              Shown on member invoices and ID cards.
            </Text>

            <View style={[styles.inputWrap, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder }]}>
              <Ionicons name="business-outline" size={18} color={palette.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: palette.text }]}
                placeholder="Business Name"
                placeholderTextColor={palette.textFaint}
                value={businessName}
                onChangeText={setBusinessName}
              />
            </View>

            <View style={[styles.inputWrap, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, marginTop: 14 }]}>
              <Ionicons name="person-outline" size={18} color={palette.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: palette.text }]}
                placeholder="Contact Person"
                placeholderTextColor={palette.textFaint}
                value={contactPerson}
                onChangeText={setContactPerson}
              />
            </View>

            <View style={[styles.inputWrap, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, marginTop: 14 }]}>
              <Ionicons name="call-outline" size={18} color={palette.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: palette.text }]}
                placeholder="Phone Number"
                placeholderTextColor={palette.textFaint}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            <View style={[styles.inputWrap, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, marginTop: 14 }]}>
              <Ionicons name="location-outline" size={18} color={palette.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: palette.text }]}
                placeholder="Address"
                placeholderTextColor={palette.textFaint}
                value={address}
                onChangeText={setAddress}
              />
            </View>

            <Pressable style={[styles.saveBtn, { backgroundColor: palette.accent }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Save</Text>}
            </Pressable>
          </ScrollView>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  topBar: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 },
  backBtn: { padding: 4 },
  topTitle: { fontSize: 18, fontWeight: '800' },

  inputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, height: 52 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15 },

  saveBtn: { marginTop: 24, paddingVertical: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});

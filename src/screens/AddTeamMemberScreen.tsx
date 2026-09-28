import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { PERMISSION_GROUPS, buildPermissions, getPermissionValue, setPermissionValue } from '../constants/permissions';
import { createTeamMember, updateTeamMember, TeamMember } from '../services/teamMember.service';

interface Props {
  onBack: () => void;
  onSaved: () => void;
  editingMember?: TeamMember | null;
}

export default function AddTeamMemberScreen({ onBack, onSaved, editingMember }: Props) {
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const isEditing = !!editingMember;

  const [name, setName] = useState(editingMember?.name || '');
  const [email, setEmail] = useState(editingMember?.email || '');
  const [mobile, setMobile] = useState(editingMember?.mobile || '');
  const [password, setPassword] = useState('');
  const [isTrainer, setIsTrainer] = useState(!!editingMember?.isTrainer);
  const [permissions, setPermissions] = useState<Record<string, any>>(
    editingMember?.permissions || buildPermissions(true)
  );
  const [saving, setSaving] = useState(false);

  const togglePermission = (key: string) => {
    setPermissions((prev) => setPermissionValue(prev, key, !getPermissionValue(prev, key)));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a name.');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Required', 'Please enter an email.');
      return;
    }
    if (!mobile.trim()) {
      Alert.alert('Required', 'Please enter a mobile number.');
      return;
    }
    if (!isEditing && password.trim().length < 6) {
      Alert.alert('Required', 'Password must be at least 6 characters.');
      return;
    }
    if (isEditing && password.trim().length > 0 && password.trim().length < 6) {
      Alert.alert('Invalid', 'Password must be at least 6 characters.');
      return;
    }

    setSaving(true);
    try {
      const input: any = {
        name: name.trim(),
        email: email.trim(),
        mobile: mobile.trim(),
        countryCode: '+91',
        isTrainer,
        permissions,
      };
      if (password.trim()) input.password = password.trim();

      if (isEditing && editingMember) {
        await updateTeamMember(editingMember._id, input);
      } else {
        await createTeamMember(input);
      }
      onSaved();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not save team member');
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
          <Text style={[styles.topTitle, { color: palette.topBarText }]}>
            {isEditing ? 'Edit Team Members' : 'Add Team Members'}
          </Text>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 18, paddingBottom: 24 }}>
          <Text style={[styles.sectionHeading, { color: palette.text }]}>Staff details</Text>

          <View style={[styles.inputWrap, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder }]}>
            <Ionicons name="person-outline" size={18} color={palette.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: palette.text }]}
              placeholder="Name"
              placeholderTextColor={palette.textFaint}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={[styles.inputWrap, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, marginTop: 12 }]}>
            <Ionicons name="mail-outline" size={18} color={palette.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: palette.text }]}
              placeholder="Email"
              placeholderTextColor={palette.textFaint}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={[styles.mobileRow, { marginTop: 12 }]}>
            <View style={[styles.countryCode, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder }]}>
              <Text style={[styles.countryCodeText, { color: palette.text }]}>🇮🇳 +91</Text>
            </View>
            <View style={[styles.inputWrap, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, flex: 1, marginLeft: 10 }]}>
              <TextInput
                style={[styles.input, { color: palette.text }]}
                placeholder="Mobile"
                placeholderTextColor={palette.textFaint}
                keyboardType="phone-pad"
                value={mobile}
                onChangeText={setMobile}
              />
            </View>
          </View>

          <View style={[styles.inputWrap, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, marginTop: 12 }]}>
            <Ionicons name="lock-closed-outline" size={18} color={palette.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: palette.text }]}
              placeholder={isEditing ? 'Leave blank to keep current password' : 'Password'}
              placeholderTextColor={palette.textFaint}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <View style={[styles.trainerCard, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.trainerTitle, { color: palette.text }]}>Trainer Role</Text>
              <Text style={[styles.trainerSubtitle, { color: palette.textMuted }]}>
                Tracks members and PT. Assign as member PT trainer.
              </Text>
            </View>
            <Switch value={isTrainer} onValueChange={setIsTrainer} trackColor={{ true: palette.accent }} />
          </View>

          <Text style={[styles.sectionHeading, { color: palette.text, marginTop: 22 }]}>Permissions</Text>

          {PERMISSION_GROUPS.map((group) => (
            <View key={group.key}>
              {group.section && (
                <Text style={[styles.groupSection, { color: palette.textMuted }]}>{group.section}</Text>
              )}
              <View style={[styles.groupCard, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
                <Text style={[styles.groupTitle, { color: palette.text }]}>{group.title}</Text>
                {group.items.map((item) => {
                  const checked = getPermissionValue(permissions, item.key);
                  return (
                    <Pressable
                      key={item.key}
                      style={styles.checkRow}
                      onPress={() => togglePermission(item.key)}
                    >
                      <Ionicons
                        name={checked ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={checked ? (palette.isDark ? palette.accent : '#15803D') : palette.textMuted}
                      />
                      <Text style={[styles.checkLabel, { color: palette.text }]}>{item.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={[styles.saveBar, { paddingBottom: insets.bottom + 14, backgroundColor: palette.background, borderTopColor: palette.cardBorder }]}>
          <Pressable style={[styles.saveBtn, { backgroundColor: palette.accent }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Save</Text>}
          </Pressable>
        </View>
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

  sectionHeading: { fontSize: 15, fontWeight: '800', marginBottom: 12 },

  inputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, height: 52 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15 },

  mobileRow: { flexDirection: 'row', alignItems: 'center' },
  countryCode: { height: 52, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  countryCodeText: { fontSize: 14 },

  trainerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginTop: 18,
  },
  trainerTitle: { fontSize: 14.5, fontWeight: '700', marginBottom: 4 },
  trainerSubtitle: { fontSize: 12, fontWeight: '500', lineHeight: 16 },

  groupSection: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, marginTop: 18, marginBottom: 8 },
  groupCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12 },
  groupTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  checkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  checkLabel: { fontSize: 13.5, fontWeight: '600' },

  saveBar: { borderTopWidth: 1, paddingHorizontal: 18, paddingTop: 12 },
  saveBtn: { paddingVertical: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});

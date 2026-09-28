import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import colors from '../theme/colors';
import { AuthUser } from '../services/auth.service';
import { Nav } from '../navigation/types';

interface Props {
  user: AuthUser;
  token: string;
  nav: Nav;
  onLogout: () => void;
}

export default function HomeScreen({ user, onLogout }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome, {user.name}!</Text>
      <Text style={styles.sub}>You are logged in as {user.role}</Text>
      <TouchableOpacity style={styles.btn} onPress={onLogout}>
        <Text style={styles.btnText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 8 },
  sub: { fontSize: 14, color: colors.textLight, marginBottom: 32 },
  btn: { backgroundColor: colors.primary, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 8 },
  btnText: { color: colors.white, fontWeight: 'bold', fontSize: 16 },
});
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  palette: any;
  message?: string;
}

export default function AccessDenied({ palette, message }: Props) {
  return (
    <View style={styles.wrap}>
      <Ionicons name="lock-closed-outline" size={40} color={palette.textFaint} />
      <Text style={[styles.title, { color: palette.text }]}>Access Denied</Text>
      <Text style={[styles.subtitle, { color: palette.textMuted }]}>
        {message || "You don't have permission to access this section. Contact your gym owner."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 10 },
  title: { fontSize: 17, fontWeight: '800', marginTop: 4 },
  subtitle: { fontSize: 13, fontWeight: '500', textAlign: 'center', lineHeight: 19 },
});

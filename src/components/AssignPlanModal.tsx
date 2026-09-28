import { View, Text, Pressable, Modal, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export interface AssignPlanItem {
  id: string;
  title: string;
  subtitle?: string;
  detailLines?: string[];
}

interface Props {
  visible: boolean;
  title: string;
  subtitle?: string;
  items: AssignPlanItem[];
  emptyText?: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export default function AssignPlanModal({ visible, title, subtitle, items, emptyText, onSelect, onClose }: Props) {
  const { palette, isDark } = useTheme();
  const accent = isDark ? palette.accent : '#006666';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.card, { backgroundColor: palette.sheetBg, borderColor: palette.surfaceBorder }]}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
              {!!subtitle && <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 2 }}>{subtitle}</Text>}
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={palette.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 420 }}>
            {items.length === 0 ? (
              <Text style={{ color: palette.textMuted, textAlign: 'center', paddingVertical: 30 }}>
                {emptyText || 'Nothing available yet.'}
              </Text>
            ) : (
              items.map((item) => (
                <Pressable
                  key={item.id}
                  style={[styles.itemRow, { borderColor: palette.cardBorder, backgroundColor: palette.cardBg }]}
                  onPress={() => onSelect(item.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, { color: palette.text }]}>{item.title}</Text>
                    {!!item.subtitle && <Text style={{ color: accent, fontSize: 12, fontWeight: '700', marginTop: 2 }}>{item.subtitle}</Text>}
                    {item.detailLines?.map((line, i) => (
                      <Text key={i} style={{ color: palette.textMuted, fontSize: 12, marginTop: 2 }}>{line}</Text>
                    ))}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={palette.textFaint} />
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 420, borderRadius: 18, borderWidth: 1, padding: 18 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  title: { fontSize: 17, fontWeight: '800' },
  itemRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  itemTitle: { fontSize: 15, fontWeight: '700' },
});

import { View, Text, Pressable, Modal, Switch, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export interface SectionVisibility {
  batch: boolean;
  ptPlans: boolean;
  services: boolean;
  workoutPlans: boolean;
  dietPlans: boolean;
  measurement: boolean;
  attendance: boolean;
  documents: boolean;
}

export const DEFAULT_SECTION_VISIBILITY: SectionVisibility = {
  batch: true,
  ptPlans: true,
  services: true,
  workoutPlans: true,
  dietPlans: true,
  measurement: true,
  attendance: true,
  documents: true,
};

const LABELS: { key: keyof SectionVisibility; label: string }[] = [
  { key: 'batch', label: 'Batch' },
  { key: 'ptPlans', label: 'PT Plans' },
  { key: 'services', label: 'Services' },
  { key: 'workoutPlans', label: 'Workout Plans' },
  { key: 'dietPlans', label: 'Diet Plans' },
  { key: 'measurement', label: 'Measurement' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'documents', label: 'Documents' },
];

interface Props {
  visible: boolean;
  value: SectionVisibility;
  onChange: (next: SectionVisibility) => void;
  onClose: () => void;
}

export default function ShowHideSectionsModal({ visible, value, onChange, onClose }: Props) {
  const { palette } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.card, { backgroundColor: palette.sheetBg, borderColor: palette.surfaceBorder }]}>
          <Text style={[styles.title, { color: palette.text }]}>Show / Hide Sections</Text>
          {LABELS.map(({ key, label }) => (
            <View key={key} style={[styles.row, { borderBottomColor: palette.surfaceBorder }]}>
              <Text style={{ color: palette.text, fontSize: 14, fontWeight: '600' }}>{label}</Text>
              <Switch
                value={value[key]}
                onValueChange={(v) => onChange({ ...value, [key]: v })}
                trackColor={{ true: palette.accent }}
              />
            </View>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 380, borderRadius: 18, borderWidth: 1, padding: 20 },
  title: { fontSize: 17, fontWeight: '800', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
});

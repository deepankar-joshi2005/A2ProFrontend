import { Modal, Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export type ConfirmVariant = 'danger' | 'warning' | 'success' | 'info';

interface ConfirmDialogProps {
  visible: boolean;
  variant?: ConfirmVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// Fixed semantic colors so danger always reads red / success always reads
// green regardless of the active light/dark accent color.
const VARIANT_COLORS: Record<ConfirmVariant, { color: string; soft: string }> = {
  danger: { color: '#FF3B30', soft: 'rgba(255, 59, 48, 0.14)' },
  warning: { color: '#FF9F0A', soft: 'rgba(255, 159, 10, 0.14)' },
  success: { color: '#2ED573', soft: 'rgba(46, 213, 115, 0.14)' },
  info: { color: '#3B82F6', soft: 'rgba(59, 130, 246, 0.14)' },
};

const DEFAULT_ICONS: Record<ConfirmVariant, keyof typeof Ionicons.glyphMap> = {
  danger: 'alert-circle',
  warning: 'warning',
  success: 'checkmark-circle',
  info: 'information-circle',
};

export default function ConfirmDialog({
  visible,
  variant = 'info',
  icon,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { palette } = useTheme();
  const { color, soft } = VARIANT_COLORS[variant];

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel} statusBarTranslucent>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable
          style={[styles.card, { backgroundColor: palette.sheetBg, borderColor: palette.surfaceBorder }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.iconWrap, { backgroundColor: soft, borderColor: color + '55' }]}>
            <Ionicons name={icon ?? DEFAULT_ICONS[variant]} size={30} color={color} />
          </View>

          <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
          {message ? <Text style={[styles.message, { color: palette.textMuted }]}>{message}</Text> : null}

          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.button, styles.cancelButton, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder }]}
              onPress={onCancel}
            >
              <Text style={[styles.buttonText, { color: palette.text }]}>{cancelText}</Text>
            </Pressable>
            <Pressable style={[styles.button, { backgroundColor: color }]} onPress={onConfirm}>
              <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>{confirmText}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  message: {
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  button: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 14.5,
    fontWeight: '700',
  },
});

import { Modal, Pressable, Text, View, StyleSheet, FlatList, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export interface SheetOption {
  label: string;
  value: string;
}

interface Props {
  visible: boolean;
  title?: string;
  options: SheetOption[];
  selectedValue?: string | null;
  onSelect: (value: string) => void;
  onClose: () => void;
}

export default function OptionSheet({ visible, title, options, selectedValue, onSelect, onClose }: Props) {
  const { palette } = useTheme();

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.sheetContainer}>
          {/* Top floating close button */}
          <Pressable
            style={[
              styles.closeBtn,
              { backgroundColor: palette.accentDeep, borderColor: palette.accent, shadowColor: palette.accent },
            ]}
            onPress={onClose}
            hitSlop={12}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>

          <Pressable
            style={[styles.sheet, { backgroundColor: palette.sheetBg, borderColor: palette.surfaceBorder }]}
            onPress={(e) => e.stopPropagation()}
          >
            {title ? <Text style={[styles.title, { color: palette.text }]}>{title}</Text> : null}
            <FlatList
              data={options}
              keyExtractor={(item, index) => item.value + '_' + index}
              style={styles.listStyle}
              showsVerticalScrollIndicator={true}
              renderItem={({ item }) => {
                const isSelected = item.value === selectedValue;
                return (
                  <Pressable
                    style={[styles.row, { borderBottomColor: palette.surfaceBorder }]}
                    onPress={() => {
                      onSelect(item.value);
                      onClose();
                    }}
                  >
                    <Text
                      style={[
                        styles.rowText,
                        { color: palette.textMuted },
                        isSelected && { color: palette.text, fontWeight: '700' },
                      ]}
                    >
                      {item.label}
                    </Text>
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off-outline'}
                      size={22}
                      color={isSelected ? palette.accent : palette.textFaint}
                    />
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    alignItems: 'center',
    width: '100%',
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -22,
    zIndex: 10,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  sheet: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 20,
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },
  listStyle: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  rowText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
    paddingRight: 12,
  },
});

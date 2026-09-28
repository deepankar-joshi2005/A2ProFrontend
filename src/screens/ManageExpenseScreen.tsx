import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  StyleSheet,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { usePermissions } from '../context/PermissionsContext';
import AccessDenied from '../components/AccessDenied';
import DateInputField from '../components/DateInputField';
import {
  getExpenses,
  getExpenseCategories,
  createExpenseCategory,
  createExpense,
  deleteExpense,
  ExpenseRecord,
} from '../services/report.service';
import { formatDate } from '../utils/date';

interface Props {
  onBack: () => void;
  initialFrom?: Date | null;
  initialTo?: Date | null;
}

const formatINR = (n: number) => `₹ ${Math.round(n || 0).toLocaleString('en-IN')}`;

const toISODateParam = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function ManageExpenseScreen({ onBack, initialFrom, initialTo }: Props) {
  const insets = useSafeAreaInsets();
  const { isDark, palette } = useTheme();
  const { role, can, guard } = usePermissions();
  const isStaff = role === 'staff';
  const canViewExpenses = !isStaff || can('expenses.view');

  const now = new Date();
  const defaultFrom = initialFrom || new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultTo = initialTo || now;

  const [from, setFrom] = useState<Date | null>(defaultFrom);
  const [to, setTo] = useState<Date | null>(defaultTo);
  const [searchText, setSearchText] = useState('');
  const [activeCategory, setActiveCategory] = useState('Type of expense');
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Category Selector Sheet State
  const [showCategorySheet, setShowCategorySheet] = useState(false);

  // Add Expense Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState<'Cash' | 'Card' | 'UPI' | 'Bank Transfer' | 'Other'>('Cash');
  const [newDate, setNewDate] = useState<Date | null>(new Date());
  const [submittingExpense, setSubmittingExpense] = useState(false);

  // Add Custom Category Prompt Modal State
  const [showAddCatPrompt, setShowAddCatPrompt] = useState(false);
  const [customCatInput, setCustomCatInput] = useState('');

  const accent = isDark ? palette.accent : '#006666';

  const loadCategories = async () => {
    try {
      const list = await getExpenseCategories();
      setCategories(list);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const loadExpenses = async (f = from, t = to, cat = activeCategory, s = searchText) => {
    try {
      const res = await getExpenses({
        from: f ? toISODateParam(f) : undefined,
        to: t ? toISODateParam(t) : undefined,
        category: cat === 'Type of expense' ? undefined : cat,
        search: s.trim() || undefined,
      });
      setExpenses(res.expenses || []);
      setTotalAmount(res.totalAmount || 0);
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!canViewExpenses) {
      setLoading(false);
      return;
    }
    setLoading(true);
    loadCategories();
    loadExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClear = () => {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    setFrom(startOfMonth);
    setTo(now);
    setSearchText('');
    setActiveCategory('Type of expense');
    setLoading(true);
    loadExpenses(startOfMonth, now, 'Type of expense', '');
  };

  const handleAddCustomCategory = async () => {
    if (!customCatInput.trim()) {
      Alert.alert('Required', 'Please enter a category name.');
      return;
    }
    try {
      const created = await createExpenseCategory(customCatInput.trim());
      await loadCategories();
      setNewCategory(created);
      setCustomCatInput('');
      setShowAddCatPrompt(false);
      Alert.alert('Success', `Category "${created}" added!`);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not add category');
    }
  };

  const handleSaveExpense = async () => {
    if (!newCategory || newCategory === 'Type of expense') {
      Alert.alert('Required', 'Please select an expense category.');
      return;
    }
    if (!newDescription.trim()) {
      Alert.alert('Required', 'Please enter an expense description.');
      return;
    }
    const numAmount = parseFloat(newAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Required', 'Please enter a valid amount.');
      return;
    }

    setSubmittingExpense(true);
    try {
      await createExpense({
        category: newCategory,
        description: newDescription.trim(),
        amount: numAmount,
        paymentMethod: newPaymentMethod,
        date: newDate ? toISODateParam(newDate) : undefined,
      });

      setShowAddModal(false);
      setNewCategory('');
      setNewDescription('');
      setNewAmount('');
      setNewDate(new Date());

      loadExpenses();
      Alert.alert('Success', 'Expense added successfully!');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not save expense');
    } finally {
      setSubmittingExpense(false);
    }
  };

  const handleDeleteExpense = (id: string, desc: string) => {
    Alert.alert('Delete Expense', `Are you sure you want to delete "${desc}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteExpense(id);
            loadExpenses();
          } catch (err) {
            Alert.alert('Error', 'Could not delete expense');
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {/* Top Header Bar */}
      <View style={[styles.topBar, { backgroundColor: palette.topBarBg }]}>
        <Pressable onPress={onBack} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={palette.topBarText} />
        </Pressable>
        <Text style={[styles.topTitle, { color: palette.topBarText }]}>Manage Expense</Text>
      </View>

      {!canViewExpenses ? (
        <AccessDenied palette={palette} />
      ) : (
        <>
      {/* Top Search Input Box (Screenshot 4) */}
      <View style={[styles.searchBoxRow, { backgroundColor: palette.topBarBg }]}>
        <View style={[styles.searchInputWrap, { backgroundColor: '#FFFFFF' }]}>
          <TextInput
            style={styles.searchInput}
            placeholder='Search for "Description"'
            placeholderTextColor="#8E9DAE"
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={() => {
              setLoading(true);
              loadExpenses();
            }}
          />
          <Pressable
            style={[styles.searchIconBtn, { backgroundColor: accent }]}
            onPress={() => {
              setLoading(true);
              loadExpenses();
            }}
          >
            <Ionicons name="search" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadExpenses();
            }}
            tintColor={accent}
          />
        }
      >
        {/* Date Filter Card (Screenshot 4) */}
        <View style={[styles.filterCard, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
          <View style={styles.dateInputsRow}>
            <View style={{ flex: 1 }}>
              <DateInputField
                icon="calendar-outline"
                placeholder="From Date"
                value={from}
                onChange={setFrom}
              />
            </View>
            <View style={{ flex: 1 }}>
              <DateInputField
                icon="calendar-outline"
                placeholder="To Date"
                value={to}
                onChange={setTo}
              />
            </View>
            <Pressable
              style={[styles.menuBtn, { borderColor: palette.inputBorder, backgroundColor: palette.inputBg }]}
              onPress={() => Alert.alert('Options', 'Export coming soon.')}
              hitSlop={6}
            >
              <Ionicons name="ellipsis-vertical" size={18} color={palette.textMuted} />
            </Pressable>
          </View>

          <View style={styles.actionButtonsRow}>
            <Pressable
              style={[styles.searchBtn, { backgroundColor: accent }]}
              onPress={() => {
                setLoading(true);
                loadExpenses();
              }}
            >
              <Text style={styles.searchBtnText}>Search</Text>
            </Pressable>
            <Pressable style={[styles.clearBtn, { borderColor: accent }]} onPress={handleClear}>
              <Text style={[styles.clearBtnText, { color: accent }]}>Clear</Text>
            </Pressable>
          </View>
        </View>

        {/* Filter Type & Total Row (Screenshot 4) */}
        <View style={styles.filterTotalRow}>
          <Pressable
            style={[styles.typeDropdownBtn, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}
            onPress={() => setShowCategorySheet(true)}
          >
            <Text style={[styles.typeDropdownText, { color: palette.text }]} numberOfLines={1}>
              {activeCategory}
            </Text>
            <Ionicons name="caret-down" size={14} color={palette.textMuted} />
          </Pressable>

          <View style={styles.totalAndDownload}>
            <Text style={[styles.totalAmountText, { color: palette.text }]}>
              Total: {formatINR(totalAmount)}
            </Text>
            <Pressable
              onPress={() => Alert.alert('Download', 'Expense report downloaded!')}
              hitSlop={6}
            >
              <Ionicons name="download-outline" size={22} color={accent} />
            </Pressable>
          </View>
        </View>

        {/* Expenses List or Empty State */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={accent} />
          </View>
        ) : expenses.length === 0 ? (
          /* Empty State matching Screenshot 4 */
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyTitle, { color: palette.text }]}>No Expense found</Text>
            <Text style={[styles.emptySubtitle, { color: palette.text }]}>
              Start Adding Expense Click Top + Icon
            </Text>
            <Text style={[styles.emptyOrText, { color: palette.textMuted }]}>OR</Text>

            <Pressable
              style={[styles.addExpenseCenterBtn, { backgroundColor: accent }]}
              onPress={() => guard('expenses.add', () => setShowAddModal(true))}
            >
              <Text style={styles.addExpenseCenterBtnText}>Add Expense</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ marginTop: 14 }}>
            {expenses.map((exp) => (
              <View
                key={exp._id}
                style={[styles.expenseCard, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}
              >
                <View style={styles.expenseCardTopRow}>
                  <View style={[styles.categoryBadge, { backgroundColor: isDark ? '#222634' : '#EBF5FF' }]}>
                    <Text style={[styles.categoryBadgeText, { color: accent }]}>{exp.category}</Text>
                  </View>
                  <Text style={[styles.expenseAmountText, { color: '#E53935' }]}>
                    - {formatINR(exp.amount)}
                  </Text>
                </View>

                <Text style={[styles.expenseDescText, { color: palette.text }]}>{exp.description}</Text>

                <View style={[styles.expenseDivider, { backgroundColor: palette.cardBorder }]} />

                <View style={styles.expenseFooterRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="calendar-outline" size={14} color={palette.textMuted} />
                    <Text style={[styles.expenseFooterText, { color: palette.textMuted }]}>
                      {formatDate(exp.date)}
                    </Text>
                    <Text style={{ color: palette.textMuted }}>·</Text>
                    <Text style={[styles.expenseFooterText, { color: palette.textMuted }]}>
                      {exp.paymentMethod}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => guard('expenses.delete', () => handleDeleteExpense(exp._id, exp.description))}
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={18} color="#E53935" />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
        </>
      )}

      {/* Floating Add Expense Button (Screenshot 4) */}
      <Pressable
        style={[styles.floatingAddBtn, { backgroundColor: accent }]}
        onPress={() => guard('expenses.add', () => setShowAddModal(true))}
      >
        <Ionicons name="add" size={20} color="#FFFFFF" />
        <Text style={styles.floatingAddBtnText}>Add Expense</Text>
      </Pressable>

      {/* Category Picker Sheet (Screenshot 5) */}
      <Modal
        visible={showCategorySheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategorySheet(false)}
      >
        <Pressable style={styles.sheetOverlay} onPress={() => setShowCategorySheet(false)}>
          <Pressable
            style={[styles.sheetContent, { backgroundColor: isDark ? '#161922' : '#FFFFFF' }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Close Circle Button */}
            <Pressable
              style={[styles.closeCircleBtn, { backgroundColor: accent }]}
              onPress={() => setShowCategorySheet(false)}
            >
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </Pressable>

            <ScrollView style={{ maxHeight: 400 }}>
              {/* Option: Type of expense (All) */}
              <Pressable
                style={styles.radioItem}
                onPress={() => {
                  setActiveCategory('Type of expense');
                  setShowCategorySheet(false);
                  loadExpenses(from, to, 'Type of expense', searchText);
                }}
              >
                <Text style={[styles.radioItemText, { color: palette.text }]}>Type of expense</Text>
                <Ionicons
                  name={activeCategory === 'Type of expense' ? 'radio-button-on' : 'radio-button-off'}
                  size={22}
                  color={activeCategory === 'Type of expense' ? accent : palette.textMuted}
                />
              </Pressable>

              {/* Dynamic categories list */}
              {categories.map((cat) => {
                const isSelected = activeCategory === cat;
                return (
                  <Pressable
                    key={cat}
                    style={styles.radioItem}
                    onPress={() => {
                      setActiveCategory(cat);
                      setShowCategorySheet(false);
                      loadExpenses(from, to, cat, searchText);
                    }}
                  >
                    <Text style={[styles.radioItemText, { color: palette.text }]}>{cat}</Text>
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={22}
                      color={isSelected ? accent : palette.textMuted}
                    />
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Add Expense Modal (Screenshot 5) */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={[styles.root, { backgroundColor: palette.background, paddingTop: insets.top }]}>
          <StatusBar style="light" />

          {/* Top Bar */}
          <View style={[styles.topBar, { backgroundColor: palette.topBarBg }]}>
            <Pressable onPress={() => setShowAddModal(false)} hitSlop={8} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={palette.topBarText} />
            </Pressable>
            <Text style={[styles.topTitle, { color: palette.topBarText }]}>Add Expense</Text>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 40 }}
          >
            {/* Category Field Card */}
            <Pressable
              style={[styles.inputCardRow, { borderColor: palette.inputBorder, backgroundColor: palette.inputBg }]}
              onPress={() => setShowCategorySheet(true)}
            >
              <Ionicons name="business-outline" size={20} color={accent} style={{ marginRight: 10 }} />
              <Text style={[styles.inputTextValue, { color: newCategory ? palette.text : palette.textMuted }]}>
                {newCategory || 'Expense Category'}
              </Text>
            </Pressable>

            {/* + Add Category Button (Screenshot 5) */}
            <Pressable
              style={[styles.addCategoryPillBtn, { borderColor: accent }]}
              onPress={() => setShowAddCatPrompt(true)}
            >
              <Ionicons name="add" size={18} color={accent} />
              <Text style={[styles.addCategoryPillText, { color: accent }]}>Add category</Text>
            </Pressable>

            {/* Expense Description Card */}
            <View style={[styles.inputCardRow, { borderColor: palette.inputBorder, backgroundColor: palette.inputBg, marginTop: 14 }]}>
              <Ionicons name="document-text-outline" size={20} color={accent} style={{ marginRight: 10 }} />
              <TextInput
                style={[styles.textInputFull, { color: palette.text }]}
                placeholder="Expense Description"
                placeholderTextColor={palette.textMuted}
                value={newDescription}
                onChangeText={setNewDescription}
              />
            </View>

            {/* Amount Card */}
            <View style={[styles.inputCardRow, { borderColor: palette.inputBorder, backgroundColor: palette.inputBg, marginTop: 14 }]}>
              <Ionicons name="cash-outline" size={20} color={accent} style={{ marginRight: 10 }} />
              <TextInput
                style={[styles.textInputFull, { color: palette.text }]}
                placeholder="Amount (₹)"
                placeholderTextColor={palette.textMuted}
                keyboardType="numeric"
                value={newAmount}
                onChangeText={setNewAmount}
              />
            </View>

            {/* Payment Method Selector */}
            <Text style={[styles.fieldLabel, { color: palette.text, marginTop: 18 }]}>Payment Method</Text>
            <View style={styles.paymentMethodRow}>
              {(['Cash', 'UPI', 'Card', 'Bank Transfer', 'Other'] as const).map((method) => (
                <Pressable
                  key={method}
                  style={[
                    styles.methodPill,
                    {
                      backgroundColor: newPaymentMethod === method ? accent : palette.inputBg,
                      borderColor: newPaymentMethod === method ? accent : palette.inputBorder,
                    },
                  ]}
                  onPress={() => setNewPaymentMethod(method)}
                >
                  <Text
                    style={[
                      styles.methodPillText,
                      { color: newPaymentMethod === method ? '#FFFFFF' : palette.text },
                    ]}
                  >
                    {method}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Date Input */}
            <Text style={[styles.fieldLabel, { color: palette.text, marginTop: 18 }]}>Date</Text>
            <DateInputField
              icon="calendar-outline"
              placeholder="Expense Date"
              value={newDate}
              onChange={setNewDate}
            />

            {/* Submit Button */}
            <Pressable
              style={[styles.saveExpenseBtn, { backgroundColor: accent }]}
              onPress={handleSaveExpense}
              disabled={submittingExpense}
            >
              {submittingExpense ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveExpenseBtnText}>Save Expense</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* Add Custom Category Dialog */}
      <Modal visible={showAddCatPrompt} transparent animationType="fade" onRequestClose={() => setShowAddCatPrompt(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setShowAddCatPrompt(false)}>
          <Pressable style={[styles.dialogCard, { backgroundColor: palette.cardBg }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.dialogTitle, { color: palette.text }]}>Add New Expense Category</Text>
            <TextInput
              style={[styles.dialogInput, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.text }]}
              placeholder="e.g. Maintenance, Snacks, Supplement"
              placeholderTextColor={palette.textMuted}
              value={customCatInput}
              onChangeText={setCustomCatInput}
            />
            <View style={styles.dialogActions}>
              <Pressable style={[styles.dialogBtn, { borderColor: palette.inputBorder }]} onPress={() => setShowAddCatPrompt(false)}>
                <Text style={{ color: palette.textMuted, fontWeight: '700' }}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.dialogBtn, { backgroundColor: accent }]} onPress={handleAddCustomCategory}>
                <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Add</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  backBtn: { padding: 4 },
  topTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  searchBoxRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    overflow: 'hidden',
    height: 44,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#000000',
  },
  searchIconBtn: {
    width: 48,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  filterCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  dateInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuBtn: {
    width: 44,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  searchBtn: {
    paddingHorizontal: 22,
    paddingVertical: 9,
    borderRadius: 8,
  },
  searchBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  clearBtn: {
    paddingHorizontal: 22,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  clearBtnText: {
    fontWeight: '800',
    fontSize: 13,
  },
  filterTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  typeDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: '55%',
  },
  typeDropdownText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  totalAndDownload: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  totalAmountText: {
    fontSize: 14,
    fontWeight: '800',
  },
  center: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyOrText: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 14,
  },
  addExpenseCenterBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
  },
  addExpenseCenterBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  floatingAddBtn: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 6,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  floatingAddBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  expenseCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  expenseCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  expenseAmountText: {
    fontSize: 16,
    fontWeight: '800',
  },
  expenseDescText: {
    fontSize: 14,
    fontWeight: '600',
    marginVertical: 4,
  },
  expenseDivider: {
    height: 1,
    marginVertical: 10,
  },
  expenseFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  expenseFooterText: {
    fontSize: 12,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  closeCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  radioItemText: {
    fontSize: 15,
    fontWeight: '600',
  },
  inputCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 52,
  },
  inputTextValue: {
    fontSize: 14.5,
    fontWeight: '600',
  },
  textInputFull: {
    flex: 1,
    fontSize: 14.5,
  },
  addCategoryPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
  },
  addCategoryPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  methodPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  methodPillText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  saveExpenseBtn: {
    marginTop: 26,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveExpenseBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  dialogCard: {
    margin: 24,
    borderRadius: 16,
    padding: 20,
    alignSelf: 'stretch',
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  dialogInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    marginBottom: 16,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  dialogBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTreasury, useAllPlayerFinancials } from '../hooks/useTreasury';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency } from '../lib/formatters';
import { AnimatedCard } from '../components/AnimatedCard';
import { AnimatedButton } from '../components/AnimatedButton';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../lib/animations';
import type { RootStackParamList } from '../types/navigation';
import type { TransactionCategory } from '../types/treasury';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Treasury'>;
};

const EXPENSE_CATEGORIES: { value: TransactionCategory; label: string }[] = [
  { value: 'venue_rental', label: 'Venue Rental' },
  { value: 'trophy_purchase', label: 'Trophy/Prizes' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'payout', label: 'Payout to Players' },
  { value: 'other', label: 'Other' },
];

interface ExpenseFormData {
  category: TransactionCategory;
  amount: string;
  description: string;
}

function ExpenseModal({
  visible,
  onClose,
  onSubmit,
  loading,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: ExpenseFormData) => void;
  loading: boolean;
}) {
  const [formData, setFormData] = useState<ExpenseFormData>({
    category: 'venue_rental',
    amount: '',
    description: '',
  });

  const handleSubmit = () => {
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (!formData.description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }
    onSubmit(formData);
    setFormData({ category: 'venue_rental', amount: '', description: '' });
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add Expense</Text>

          <Text style={styles.inputLabel}>Category</Text>
          <View style={styles.categoryContainer}>
            {EXPENSE_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.categoryButton,
                  formData.category === cat.value && styles.categoryButtonActive,
                ]}
                onPress={() => setFormData({ ...formData, category: cat.value })}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    formData.category === cat.value && styles.categoryButtonTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>Amount ($)</Text>
          <TextInput
            style={styles.input}
            value={formData.amount}
            onChangeText={(text) => setFormData({ ...formData, amount: text })}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={COLORS.TEXT_TERTIARY}
          />

          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            placeholder="What was this expense for?"
            placeholderTextColor={COLORS.TEXT_TERTIARY}
            multiline
            numberOfLines={3}
          />

          <View style={styles.modalButtons}>
            <AnimatedButton
              variant="ghost"
              onPress={onClose}
              disabled={loading}
              style={styles.modalButton}
            >
              Cancel
            </AnimatedButton>
            <AnimatedButton
              variant="primary"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              style={styles.modalButton}
            >
              Add Expense
            </AnimatedButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function MatchFeeConfigModal({
  visible,
  onClose,
  currentFee,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  currentFee: number;
  onSave: (fee: number) => void;
}) {
  const [fee, setFee] = useState(currentFee.toString());

  const handleSave = () => {
    const newFee = parseFloat(fee);
    if (isNaN(newFee) || newFee <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    onSave(newFee);
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Match Fee Configuration</Text>
          
          <Text style={styles.modalDescription}>
            Set the match fee per player. This applies to all future matches.
            Current matches are not affected.
          </Text>

          <Text style={styles.inputLabel}>Match Fee Per Player ($)</Text>
          <TextInput
            style={styles.input}
            value={fee}
            onChangeText={setFee}
            keyboardType="decimal-pad"
            placeholder="5.00"
            placeholderTextColor={COLORS.TEXT_TERTIARY}
          />

          <Text style={styles.feePreview}>
            Total per match: ${(parseFloat(fee || '0') * 2).toFixed(2)}
          </Text>

          <View style={styles.modalButtons}>
            <AnimatedButton
              variant="ghost"
              onPress={onClose}
              style={styles.modalButton}
            >
              Cancel
            </AnimatedButton>
            <AnimatedButton
              variant="primary"
              onPress={handleSave}
              style={styles.modalButton}
            >
              Save
            </AnimatedButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function AdminTreasuryScreen({ navigation }: Props) {
  const { profile } = useAuth();
  const {
    transactions,
    stats,
    categoryBreakdown,
    loading,
    error,
    refresh,
    addExpense,
  } = useTreasury();
  const { summaries: playerSummaries, loading: playersLoading } = useAllPlayerFinancials();

  const [expenseModalVisible, setExpenseModalVisible] = useState(false);
  const [feeModalVisible, setFeeModalVisible] = useState(false);
  const [addingExpense, setAddingExpense] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'players'>('overview');
  const [matchFee, setMatchFee] = useState(5.0);

  const isAdmin = profile?.is_admin ?? false;

  const handleAddExpense = async (formData: ExpenseFormData) => {
    setAddingExpense(true);
    const result = await addExpense(
      formData.category,
      parseFloat(formData.amount),
      formData.description
    );
    setAddingExpense(false);

    if (result.success) {
      setExpenseModalVisible(false);
      Alert.alert('Success', 'Expense added successfully');
    } else {
      Alert.alert('Error', result.error || 'Failed to add expense');
    }
  };

  const handleExportData = () => {
    const exportData = {
      generatedAt: new Date().toISOString(),
      stats,
      transactions: transactions.slice(0, 100),
      playerSummaries,
    };

    Alert.alert(
      'Export Data',
      'Data export prepared. In production, this would download a CSV file.',
      [
        {
          text: 'Copy to Clipboard',
          onPress: () => {
            console.log('Export data:', JSON.stringify(exportData, null, 2));
          },
        },
        { text: 'OK' },
      ]
    );
  };

  const renderOverviewTab = () => (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={COLORS.PRIMARY} />
      }
    >
      {/* Admin Actions */}
      <View style={styles.adminActions}>
        <AnimatedCard style={styles.adminActionCard}>
          <TouchableOpacity
            style={styles.adminActionButton}
            onPress={() => setExpenseModalVisible(true)}
          >
            <Text style={styles.adminActionIcon}>➖</Text>
            <Text style={styles.adminActionText}>Add Expense</Text>
          </TouchableOpacity>
        </AnimatedCard>

        <AnimatedCard style={styles.adminActionCard}>
          <TouchableOpacity
            style={styles.adminActionButton}
            onPress={() => setFeeModalVisible(true)}
          >
            <Text style={styles.adminActionIcon}>💵</Text>
            <Text style={styles.adminActionText}>Set Match Fee</Text>
          </TouchableOpacity>
        </AnimatedCard>

        <AnimatedCard style={styles.adminActionCard}>
          <TouchableOpacity
            style={styles.adminActionButton}
            onPress={handleExportData}
          >
            <Text style={styles.adminActionIcon}>📊</Text>
            <Text style={styles.adminActionText}>Export Data</Text>
          </TouchableOpacity>
        </AnimatedCard>
      </View>

      {/* Balance Card */}
      {stats && (
        <AnimatedCard style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <Text style={styles.balanceAmount}>{formatCurrency(stats.currentBalance)}</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Total Income</Text>
              <Text style={[styles.statValue, styles.incomeText]}>+{formatCurrency(stats.totalIncome)}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Total Expenses</Text>
              <Text style={[styles.statValue, styles.expenseText]}>-{formatCurrency(stats.totalExpenses)}</Text>
            </View>
          </View>
        </AnimatedCard>
      )}

      {/* Category Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Category Breakdown</Text>
        {categoryBreakdown.map((cat, index) => (
          <AnimatedCard key={cat.category} index={index} style={styles.breakdownCard}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownCategory}>{cat.category}</Text>
              <Text
                style={[
                  styles.breakdownAmount,
                  cat.total >= 0 ? styles.incomeText : styles.expenseText,
                ]}
              >
                {cat.total >= 0 ? '+' : ''}
                {formatCurrency(Math.abs(cat.total))}
              </Text>
            </View>
          </AnimatedCard>
        ))}
      </View>
    </ScrollView>
  );

  const renderPlayersTab = () => (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={playersLoading} onRefresh={refresh} tintColor={COLORS.PRIMARY} />
      }
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Player Balances</Text>
        {playerSummaries.map((player, index) => (
          <AnimatedCard key={player.player_id} index={index} style={styles.playerCard}>
            <View style={styles.playerRow}>
              <Text style={styles.playerRank}>#{index + 1}</Text>
              <Text style={styles.playerName}>{player.display_name || 'Unknown'}</Text>
              <View style={styles.playerStats}>
                <Text style={styles.playerStat}>Fees: {formatCurrency(player.total_match_fees_paid)}</Text>
                <Text
                  style={[
                    styles.playerNet,
                    player.net_contribution >= 0 ? styles.expenseText : styles.incomeText,
                  ]}
                >
                  Net: {player.net_contribution >= 0 ? '+' : '-'}
                  {formatCurrency(Math.abs(player.net_contribution))}
                </Text>
              </View>
            </View>
          </AnimatedCard>
        ))}
      </View>
    </ScrollView>
  );

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Admin Treasury</Text>
          <View style={{ width: 50 }} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Admin access required</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Admin Treasury</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'players' && styles.tabActive]}
          onPress={() => setActiveTab('players')}
        >
          <Text style={[styles.tabText, activeTab === 'players' && styles.tabTextActive]}>Players</Text>
        </TouchableOpacity>
      </View>

      {loading && !transactions.length ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <AnimatedButton variant="primary" onPress={refresh}>
            Retry
          </AnimatedButton>
        </View>
      ) : activeTab === 'overview' ? (
        renderOverviewTab()
      ) : (
        renderPlayersTab()
      )}

      <ExpenseModal
        visible={expenseModalVisible}
        onClose={() => setExpenseModalVisible(false)}
        onSubmit={handleAddExpense}
        loading={addingExpense}
      />

      <MatchFeeConfigModal
        visible={feeModalVisible}
        onClose={() => setFeeModalVisible(false)}
        currentFee={matchFee}
        onSave={setMatchFee}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.LG,
    paddingTop: 60,
    paddingBottom: SPACING.MD,
  },
  backButton: {
    color: COLORS.PRIMARY,
    fontSize: 16,
  },
  title: {
    ...TYPOGRAPHY.H3,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.MD,
    paddingBottom: SPACING.MD,
    gap: SPACING.SM,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.SM,
    borderRadius: RADIUS.MD,
    backgroundColor: COLORS.SURFACE,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  tabText: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: COLORS.TEXT_PRIMARY,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.MD,
  },
  errorText: {
    color: COLORS.ERROR,
    ...TYPOGRAPHY.BODY,
  },
  adminActions: {
    flexDirection: 'row',
    padding: SPACING.MD,
    gap: SPACING.SM,
  },
  adminActionCard: {
    flex: 1,
    marginBottom: 0,
    padding: 0,
  },
  adminActionButton: {
    padding: SPACING.MD,
    alignItems: 'center',
  },
  adminActionIcon: {
    fontSize: 24,
    marginBottom: SPACING.XS,
  },
  adminActionText: {
    ...TYPOGRAPHY.BODY_SMALL,
    fontWeight: '600',
  },
  balanceCard: {
    margin: SPACING.MD,
    padding: SPACING.LG,
    alignItems: 'center',
  },
  balanceLabel: {
    ...TYPOGRAPHY.BODY_SMALL,
    marginBottom: SPACING.SM,
  },
  balanceAmount: {
    color: COLORS.SUCCESS,
    fontSize: 48,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: SPACING.LG,
    gap: SPACING.XL,
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    ...TYPOGRAPHY.CAPTION,
    marginBottom: SPACING.XS,
  },
  statValue: {
    ...TYPOGRAPHY.BODY,
    fontWeight: 'bold',
  },
  incomeText: {
    color: COLORS.SUCCESS,
  },
  expenseText: {
    color: COLORS.ERROR,
  },
  section: {
    padding: SPACING.MD,
  },
  sectionTitle: {
    ...TYPOGRAPHY.H4,
    marginBottom: SPACING.MD,
  },
  breakdownCard: {
    marginBottom: SPACING.SM,
    padding: 0,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.MD,
  },
  breakdownCategory: {
    ...TYPOGRAPHY.BODY,
    textTransform: 'capitalize',
  },
  breakdownAmount: {
    ...TYPOGRAPHY.BODY,
    fontWeight: '600',
  },
  playerCard: {
    marginBottom: SPACING.SM,
    padding: 0,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.MD,
  },
  playerRank: {
    color: COLORS.PRIMARY,
    ...TYPOGRAPHY.BODY,
    fontWeight: 'bold',
    width: 40,
  },
  playerName: {
    ...TYPOGRAPHY.BODY,
    flex: 1,
  },
  playerStats: {
    alignItems: 'flex-end',
  },
  playerStat: {
    ...TYPOGRAPHY.CAPTION,
  },
  playerNet: {
    ...TYPOGRAPHY.BODY,
    fontWeight: 'bold',
    marginTop: SPACING.XS,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.BACKGROUND,
    borderTopLeftRadius: RADIUS.XL,
    borderTopRightRadius: RADIUS.XL,
    padding: SPACING.LG,
    paddingBottom: SPACING.XXL,
  },
  modalTitle: {
    ...TYPOGRAPHY.H3,
    marginBottom: SPACING.LG,
  },
  modalDescription: {
    ...TYPOGRAPHY.BODY_SMALL,
    marginBottom: SPACING.LG,
  },
  inputLabel: {
    ...TYPOGRAPHY.BODY_SMALL,
    marginBottom: SPACING.SM,
  },
  input: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: RADIUS.MD,
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
    color: COLORS.TEXT_PRIMARY,
    ...TYPOGRAPHY.BODY,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.SM,
    marginBottom: SPACING.MD,
  },
  categoryButton: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: RADIUS.MD,
    backgroundColor: COLORS.SURFACE,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  categoryButtonActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  categoryButtonText: {
    ...TYPOGRAPHY.CAPTION,
  },
  categoryButtonTextActive: {
    color: COLORS.TEXT_PRIMARY,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.MD,
    marginTop: SPACING.SM,
  },
  modalButton: {
    flex: 1,
  },
  feePreview: {
    ...TYPOGRAPHY.BODY_SMALL,
    marginBottom: SPACING.MD,
  },
});

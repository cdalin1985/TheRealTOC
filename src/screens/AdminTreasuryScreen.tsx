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
import { COLORS } from '../lib/animations';
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
            placeholderTextColor="#666"
          />

          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            placeholder="What was this expense for?"
            placeholderTextColor="#666"
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
            placeholderTextColor="#666"
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
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'players' | 'export'>('overview');
  const [matchFee, setMatchFee] = useState(5.0); // Default $5 per player

  // Check if user is admin
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
    // In a real app, this would generate a CSV/Excel file
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
            // Would use Clipboard API here
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
        <RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#e94560" />
      }
    >
      {/* Admin Actions */}
      <View style={styles.adminActions}>
        <TouchableOpacity
          style={styles.adminActionButton}
          onPress={() => setExpenseModalVisible(true)}
        >
          <Text style={styles.adminActionIcon}>➖</Text>
          <Text style={styles.adminActionText}>Add Expense</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.adminActionButton}
          onPress={() => setFeeModalVisible(true)}
        >
          <Text style={styles.adminActionIcon}>💵</Text>
          <Text style={styles.adminActionText}>Set Match Fee</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.adminActionButton}
          onPress={handleExportData}
        >
          <Text style={styles.adminActionIcon}>📊</Text>
          <Text style={styles.adminActionText}>Export Data</Text>
        </TouchableOpacity>
      </View>

      {/* Balance Card */}
      {stats && (
        <View style={styles.balanceCard}>
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
        </View>
      )}

      {/* Category Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Category Breakdown</Text>
        {categoryBreakdown.map((cat) => (
          <View key={cat.category} style={styles.breakdownItem}>
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
        ))}
      </View>
    </ScrollView>
  );

  const renderPlayersTab = () => (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={playersLoading} onRefresh={refresh} tintColor="#e94560" />
      }
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Player Balances</Text>
        {playerSummaries.map((player, index) => (
          <View key={player.player_id} style={styles.playerRow}>
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
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    color: '#e94560',
    fontSize: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#16213e',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#e94560',
  },
  tabText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 16,
    marginBottom: 16,
  },
  retryText: {
    color: '#e94560',
    fontSize: 16,
  },
  adminActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  adminActionButton: {
    flex: 1,
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  adminActionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  adminActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  balanceCard: {
    backgroundColor: '#16213e',
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  balanceLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
  },
  balanceAmount: {
    color: '#2ecc71',
    fontSize: 48,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 32,
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  incomeText: {
    color: '#2ecc71',
  },
  expenseText: {
    color: '#e74c3c',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4e',
  },
  breakdownCategory: {
    color: '#fff',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  breakdownAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  playerRank: {
    color: '#e94560',
    fontSize: 14,
    fontWeight: 'bold',
    width: 40,
  },
  playerName: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
  playerStats: {
    alignItems: 'flex-end',
  },
  playerStat: {
    color: '#888',
    fontSize: 12,
  },
  playerNet: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalDescription: {
    color: '#888',
    fontSize: 14,
    marginBottom: 20,
  },
  inputLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#16213e',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    color: '#fff',
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#16213e',
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  categoryButtonActive: {
    backgroundColor: '#e94560',
    borderColor: '#e94560',
  },
  categoryButtonText: {
    color: '#888',
    fontSize: 12,
  },
  categoryButtonTextActive: {
    color: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#e94560',
  },
  modalButtonSecondary: {
    backgroundColor: '#16213e',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  feePreview: {
    color: '#888',
    fontSize: 14,
    marginBottom: 16,
  },
});

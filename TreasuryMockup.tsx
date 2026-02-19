import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

// MOCKUP ONLY - Visual reference for League Treasury / Money Tracker
// This file is NOT connected to the actual app

type TransactionType = 'income' | 'expense';
type TransactionCategory = 
  | 'match_fee' 
  | 'membership_dues' 
  | 'venue_rental' 
  | 'trophy_purchase' 
  | 'equipment' 
  | 'payout' 
  | 'other';

interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  description: string;
  playerName?: string;
  adminName?: string;
  balanceAfter: number;
}

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    date: 'Today 2:34 PM',
    type: 'income',
    category: 'match_fee',
    amount: 10,
    description: 'Match fee: Mike vs Tommy',
    playerName: 'Mike "The Shark" Johnson',
    balanceAfter: 1240,
  },
  {
    id: '2',
    date: 'Today 2:34 PM',
    type: 'income',
    category: 'match_fee',
    amount: 10,
    description: 'Match fee: Mike vs Tommy',
    playerName: 'Tommy D',
    balanceAfter: 1230,
  },
  {
    id: '3',
    date: 'Yesterday 6:00 PM',
    type: 'income',
    category: 'match_fee',
    amount: 10,
    description: 'Match fee: Sarah vs Big Dave',
    playerName: 'Sarah Chen',
    balanceAfter: 1220,
  },
  {
    id: '4',
    date: 'Yesterday 6:00 PM',
    type: 'income',
    category: 'match_fee',
    amount: 10,
    description: 'Match fee: Sarah vs Big Dave',
    playerName: 'Big Dave',
    balanceAfter: 1210,
  },
  {
    id: '5',
    date: 'Feb 17',
    type: 'expense',
    category: 'trophy_purchase',
    amount: 150,
    description: '1st Place Trophy - Spring Season',
    adminName: 'League Admin',
    balanceAfter: 1200,
  },
  {
    id: '6',
    date: 'Feb 17',
    type: 'expense',
    category: 'trophy_purchase',
    amount: 100,
    description: '2nd Place Trophy - Spring Season',
    adminName: 'League Admin',
    balanceAfter: 1350,
  },
  {
    id: '7',
    date: 'Feb 17',
    type: 'expense',
    category: 'trophy_purchase',
    amount: 75,
    description: '3rd Place Trophy - Spring Season',
    adminName: 'League Admin',
    balanceAfter: 1450,
  },
  {
    id: '8',
    date: 'Feb 15',
    type: 'income',
    category: 'match_fee',
    amount: 10,
    description: 'Match fee: Rookie Rick vs Fast Eddie',
    playerName: 'Rookie Rick',
    balanceAfter: 1525,
  },
  {
    id: '9',
    date: 'Feb 15',
    type: 'income',
    category: 'match_fee',
    amount: 10,
    description: 'Match fee: Rookie Rick vs Fast Eddie',
    playerName: 'Fast Eddie',
    balanceAfter: 1515,
  },
  {
    id: '10',
    date: 'Feb 14',
    type: 'expense',
    category: 'venue_rental',
    amount: 200,
    description: 'Eagles 4040 - Monthly table rental',
    adminName: 'League Admin',
    balanceAfter: 1505,
  },
  {
    id: '11',
    date: 'Feb 10',
    type: 'income',
    category: 'membership_dues',
    amount: 25,
    description: 'Annual membership renewal',
    playerName: 'Mike "The Shark" Johnson',
    balanceAfter: 1705,
  },
  {
    id: '12',
    date: 'Feb 10',
    type: 'income',
    category: 'membership_dues',
    amount: 25,
    description: 'Annual membership renewal',
    playerName: 'Sarah Chen',
    balanceAfter: 1680,
  },
  {
    id: '13',
    date: 'Feb 10',
    type: 'income',
    category: 'membership_dues',
    amount: 25,
    description: 'Annual membership renewal',
    playerName: 'Tommy D',
    balanceAfter: 1655,
  },
  {
    id: '14',
    date: 'Feb 8',
    type: 'expense',
    category: 'equipment',
    amount: 45,
    description: 'New cue ball - Valley Hub',
    adminName: 'League Admin',
    balanceAfter: 1630,
  },
  {
    id: '15',
    date: 'Feb 1',
    type: 'income',
    category: 'membership_dues',
    amount: 25,
    description: 'Annual membership renewal',
    playerName: 'Big Dave',
    balanceAfter: 1675,
  },
];

const CURRENT_BALANCE = 1240;

const getCategoryIcon = (category: TransactionCategory): string => {
  switch (category) {
    case 'match_fee': return '🎱';
    case 'membership_dues': return '💳';
    case 'venue_rental': return '🏢';
    case 'trophy_purchase': return '🏆';
    case 'equipment': return '🎯';
    case 'payout': return '💸';
    case 'other': return '📝';
    default: return '💰';
  }
};

const getCategoryLabel = (category: TransactionCategory): string => {
  switch (category) {
    case 'match_fee': return 'Match Fee';
    case 'membership_dues': return 'Membership';
    case 'venue_rental': return 'Venue Rental';
    case 'trophy_purchase': return 'Trophy';
    case 'equipment': return 'Equipment';
    case 'payout': return 'Payout';
    case 'other': return 'Other';
    default: return category;
  }
};

function TransactionCard({ item }: { item: Transaction }) {
  const isIncome = item.type === 'income';
  
  return (
    <View style={styles.transactionCard}>
      <View style={[
        styles.iconContainer,
        isIncome ? styles.iconIncome : styles.iconExpense
      ]}>
        <Text style={styles.icon}>{getCategoryIcon(item.category)}</Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.category}>{getCategoryLabel(item.category)}</Text>
          <Text style={styles.date}>{item.date}</Text>
        </View>
        
        <Text style={styles.description}>{item.description}</Text>
        
        {item.playerName && (
          <Text style={styles.playerName}>From: {item.playerName}</Text>
        )}
        {item.adminName && (
          <Text style={styles.adminName}>By: {item.adminName}</Text>
        )}
        
        <View style={styles.amountRow}>
          <Text style={[
            styles.amount,
            isIncome ? styles.amountIncome : styles.amountExpense
          ]}>
            {isIncome ? '+' : '-'}${item.amount}
          </Text>
          <Text style={styles.balanceAfter}>
            Balance: ${item.balanceAfter}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function TreasuryMockup() {
  const totalIncome = MOCK_TRANSACTIONS
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpenses = MOCK_TRANSACTIONS
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <View style={styles.container}>
      {/* Header with Big Balance */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>League Treasury</Text>
        <Text style={styles.balance}>${CURRENT_BALANCE}</Text>
        <Text style={styles.balanceLabel}>Current Balance</Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statBox, styles.statIncome]}>
          <Text style={styles.statIcon}>📈</Text>
          <Text style={styles.statLabel}>Total In</Text>
          <Text style={styles.statAmount}>+${totalIncome}</Text>
        </View>
        <View style={[styles.statBox, styles.statExpense]}>
          <Text style={styles.statIcon}>📉</Text>
          <Text style={styles.statLabel}>Total Out</Text>
          <Text style={styles.statAmount}>-${totalExpenses}</Text>
        </View>
        <View style={[styles.statBox, styles.statNet]}>
          <Text style={styles.statIcon}>💰</Text>
          <Text style={styles.statLabel}>Net</Text>
          <Text style={styles.statAmount}>+${totalIncome - totalExpenses}</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity style={[styles.filterTab, styles.filterTabActive]}>
          <Text style={styles.filterTabTextActive}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterTab}>
          <Text style={styles.filterTabText}>Income</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterTab}>
          <Text style={styles.filterTabText}>Expenses</Text>
        </TouchableOpacity>
      </View>

      {/* Transaction List */}
      <ScrollView style={styles.scrollView}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {MOCK_TRANSACTIONS.map((item) => (
          <TransactionCard key={item.id} item={item} />
        ))}
        
        <TouchableOpacity style={styles.loadMore}>
          <Text style={styles.loadMoreText}>View older transactions...</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 24,
    backgroundColor: '#16213e',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4e',
  },
  headerLabel: {
    fontSize: 16,
    color: '#888',
    marginBottom: 8,
  },
  balance: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#2ecc71',
    letterSpacing: -2,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statIncome: {
    borderTopWidth: 3,
    borderTopColor: '#2ecc71',
  },
  statExpense: {
    borderTopWidth: 3,
    borderTopColor: '#e74c3c',
  },
  statNet: {
    borderTopWidth: 3,
    borderTopColor: '#3498db',
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  statAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4e',
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#16213e',
  },
  filterTabActive: {
    backgroundColor: '#e94560',
  },
  filterTabText: {
    color: '#888',
    fontSize: 14,
  },
  filterTabTextActive: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  transactionCard: {
    flexDirection: 'row',
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconIncome: {
    backgroundColor: 'rgba(46, 204, 113, 0.2)',
  },
  iconExpense: {
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
  },
  icon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  category: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  date: {
    fontSize: 12,
    color: '#666',
  },
  description: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  playerName: {
    fontSize: 12,
    color: '#3498db',
    marginBottom: 2,
  },
  adminName: {
    fontSize: 12,
    color: '#9b59b6',
    marginBottom: 2,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#2a2a4e',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  amountIncome: {
    color: '#2ecc71',
  },
  amountExpense: {
    color: '#e74c3c',
  },
  balanceAfter: {
    fontSize: 12,
    color: '#666',
  },
  loadMore: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadMoreText: {
    color: '#666',
    fontSize: 14,
  },
});

/*
TREASURY DESIGN NOTES:
=====================

1. BIG BALANCE DISPLAY
   - Giant green number at top shows current league funds
   - Updates in real-time as transactions happen
   - Always visible - the "source of truth"

2. QUICK STATS ROW
   - Total In (green) - all money ever collected
   - Total Out (red) - all money ever spent
   - Net (blue) - difference over league lifetime
   - Gives context for the current balance

3. TRANSACTION CARDS
   Each transaction shows:
   - Icon by category (match fee, trophy, etc.)
   - What it was for
   - Who paid/received
   - Amount (+green or -red)
   - Running balance after that transaction

4. CATEGORY ICONS
   🎱 Match Fee - from players
   💳 Membership - annual dues
   🏢 Venue Rental - paying for tables
   🏆 Trophy - prizes
   🎯 Equipment - balls, cues, etc.
   💸 Payout - winnings distributed

5. TRANSPARENCY FEATURES
   - Every transaction shows WHO (player or admin name)
   - Every transaction shows running balance
   - Filter by income/expense/all
   - Infinite scroll through history
   - No hidden transactions - everything visible

6. ADMIN ACTIONS (not shown in mockup)
   - Add expense button (for admins only)
   - Add income button (for admins only)
   - Require note/description for all admin actions
   - Show admin name on every transaction they create

7. POTENTIAL FEATURES
   - Monthly reports view
   - Export to CSV
   - Push notification on balance change
   - "Pending" payments (marked when submitted, confirmed when admin verifies)
*/

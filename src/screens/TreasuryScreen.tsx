import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTreasury, useAllPlayerFinancials, usePlayerFinancials } from '../hooks/useTreasury';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency } from '../lib/formatters';
import { PaymentButton } from '../components/PaymentButton';
import { PlayerPaymentHistory } from '../components/PlayerPaymentHistory';
import { AnimatedCard } from '../components/AnimatedCard';
import { AnimatedButton } from '../components/AnimatedButton';
import { COLORS } from '../lib/animations';
import type { RootStackParamList } from '../types/navigation';
import type { Transaction, PlayerFinancialSummary, TransactionCategory } from '../types/treasury';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Treasury'>;
};

const CATEGORY_LABELS: Record<TransactionCategory, string> = {
  match_fee: 'Match Fee',
  membership_dues: 'Membership',
  venue_rental: 'Venue Rental',
  trophy_purchase: 'Trophy',
  equipment: 'Equipment',
  payout: 'Payout',
  other: 'Other',
};

function BalanceCard({ stats }: { stats: { currentBalance: number; totalIncome: number; totalExpenses: number; net: number } | null }) {
  if (!stats) return null;
  
  return (
    <AnimatedCard style={styles.balanceCard}>
      <Text style={styles.balanceLabel}>League Treasury</Text>
      <Text style={styles.balanceAmount}>{formatCurrency(stats.currentBalance)}</Text>
      <Text style={styles.balanceSubtext}>Current Balance</Text>
      
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Total In</Text>
          <Text style={[styles.statValue, styles.incomeText]}>+{formatCurrency(stats.totalIncome)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Total Out</Text>
          <Text style={[styles.statValue, styles.expenseText]}>-{formatCurrency(stats.totalExpenses)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Net</Text>
          <Text style={[styles.statValue, stats.net >= 0 ? styles.incomeText : styles.expenseText]}>{stats.net >= 0 ? '+' : ''}{formatCurrency(stats.net)}</Text>
        </View>
      </View>
    </AnimatedCard>
  );
}

function TransactionItem({ item }: { item: Transaction }) {
  const isIncome = item.type === 'income';
  
  return (
    <View style={styles.transactionItem}>
      <View style={styles.transactionHeader}>
        <Text style={styles.transactionCategory}>{CATEGORY_LABELS[item.category]}</Text>
        <Text style={styles.transactionDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
      
      <Text style={styles.transactionDescription}>{item.description}</Text>
      
      {item.player_name && (
        <Text style={styles.transactionMeta}>From: {item.player_name}</Text>
      )}
      {item.admin_name && (
        <Text style={styles.transactionMeta}>By: {item.admin_name}</Text>
      )}
      
      <View style={styles.transactionFooter}>
        <Text style={[styles.transactionAmount, isIncome ? styles.incomeText : styles.expenseText]}>
          {isIncome ? '+' : '-'}{formatCurrency(item.amount)}
        </Text>
        <Text style={styles.transactionBalance}>Balance: {formatCurrency(item.balance_after)}</Text>
      </View>
    </View>
  );
}

function PlayerSummaryItem({ item, index, onPress }: { item: PlayerFinancialSummary; index: number; onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.playerItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.playerRank}>
        <Text style={styles.playerRankText}>#{index + 1}</Text>
      </View>
      <View style={styles.playerInfo}>
        <Text style={styles.playerName}>{item.display_name || 'Unknown'}</Text>
        <Text style={styles.playerRankPosition}>Rank: #{item.rank_position || '?'}</Text>
      </View>
      <View style={styles.playerStats}>
        <Text style={styles.playerStatLabel}>Match Fees</Text>
        <Text style={styles.playerStatValue}>{formatCurrency(item.total_match_fees_paid)}</Text>
        
        <Text style={styles.playerStatLabel}>Net</Text>
        <Text style={[styles.playerStatValue, item.net_contribution >= 0 ? styles.incomeText : styles.expenseText]}>
          {item.net_contribution >= 0 ? '+' : ''}{formatCurrency(item.net_contribution)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export function TreasuryScreen({ navigation }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'players' | 'my-history'>('overview');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const { transactions, stats, loading, error, refresh } = useTreasury();
  const { summaries: playerSummaries, loading: playersLoading } = useAllPlayerFinancials();
  const { profile, user } = useAuth();
  
  // Get current user's player data
  const { summary: mySummary } = usePlayerFinancials(profile?.id || null);

  const isAdmin = profile?.is_admin ?? false;

  const handlePaymentComplete = () => {
    Alert.alert(
      'Payment Initiated',
      'Thank you! Please complete the payment in your selected app. The treasurer will verify and record your payment.',
      [{ text: 'OK' }]
    );
  };

  const handlePaymentError = (error: string) => {
    Alert.alert('Payment Error', error);
  };

  const handlePlayerPress = (playerId: string) => {
    setSelectedPlayerId(playerId);
    setActiveTab('my-history');
  };

  const renderContent = () => {
    if (activeTab === 'overview') {
      return (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#e94560" />
          }
        >
          <BalanceCard stats={stats} />
          
          {/* Quick Payment Section */}
          <View style={styles.paymentSection}>
            <Text style={styles.sectionTitle}>Quick Payment</Text>
            <View style={styles.paymentCard}>
              <Text style={styles.paymentDescription}>
                Pay your match fee ($5.00) quickly using your preferred payment app.
              </Text>
              <PaymentButton
                amount={5.00}
                description="Pool league match fee"
                onPaymentComplete={handlePaymentComplete}
                onPaymentError={handlePaymentError}
                buttonStyle="primary"
              />
            </View>
          </View>
          
          {/* Admin Access Button */}
          {isAdmin && (
            <AnimatedButton
              variant="secondary"
              onPress={() => navigation.navigate('AdminTreasury')}
              style={styles.adminButton}
            >
              🔒 Admin Treasury
            </AnimatedButton>
          )}
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            {transactions.slice(0, 5).map((t) => (
              <TransactionItem key={t.id} item={t} />
            ))}
            {transactions.length > 5 && (
              <TouchableOpacity onPress={() => setActiveTab('transactions')}>
                <Text style={styles.viewAll}>View all transactions →</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      );
    }

    if (activeTab === 'transactions') {
      return (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#e94560" />
          }
        >
          {transactions.map((t) => (
            <TransactionItem key={t.id} item={t} />
          ))}
        </ScrollView>
      );
    }

    if (activeTab === 'players') {
      return (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={playersLoading} onRefresh={refresh} tintColor="#e94560" />
          }
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Player Contributions</Text>
            <Text style={styles.sectionSubtitle}>Tap a player to view their history</Text>
          </View>
          {playerSummaries.map((p, i) => (
            <PlayerSummaryItem 
              key={p.player_id} 
              item={p} 
              index={i} 
              onPress={() => handlePlayerPress(p.player_id)}
            />
          ))}
        </ScrollView>
      );
    }

    if (activeTab === 'my-history') {
      const targetPlayerId = selectedPlayerId || profile?.id;
      const targetPlayerName = selectedPlayerId 
        ? playerSummaries.find(p => p.player_id === selectedPlayerId)?.display_name
        : profile?.display_name;

      return (
        <View style={styles.historyContainer}>
          <View style={styles.historyHeader}>
            <TouchableOpacity 
              style={styles.backToPlayersButton}
              onPress={() => {
                setSelectedPlayerId(null);
                setActiveTab('players');
              }}
            >
              <Text style={styles.backToPlayersText}>← Back to Players</Text>
            </TouchableOpacity>
            <Text style={styles.historyTitle}>
              {selectedPlayerId ? `${targetPlayerName}'s History` : 'My Payment History'}
            </Text>
          </View>
          {targetPlayerId && (
            <PlayerPaymentHistory 
              playerId={targetPlayerId} 
              playerName={targetPlayerName}
            />
          )}
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Treasury</Text>
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
          style={[styles.tab, (activeTab === 'transactions' || activeTab === 'my-history') && styles.tabActive]}
          onPress={() => setActiveTab('transactions')}
        >
          <Text style={[styles.tabText, (activeTab === 'transactions' || activeTab === 'my-history') && styles.tabTextActive]}>Transactions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'players' && styles.tabActive]}
          onPress={() => {
            setSelectedPlayerId(null);
            setActiveTab('players');
          }}
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
      ) : (
        renderContent()
      )}
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
  balanceSubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 16,
  },
  statBox: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  statLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  incomeText: {
    color: '#2ecc71',
  },
  expenseText: {
    color: '#e74c3c',
  },
  paymentSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  paymentCard: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 20,
  },
  paymentDescription: {
    color: '#888',
    fontSize: 14,
    marginBottom: 16,
  },
  adminButton: {
    backgroundColor: '#6B1CB0',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  adminButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
  sectionSubtitle: {
    color: '#666',
    fontSize: 12,
    marginTop: -12,
    marginBottom: 12,
  },
  viewAll: {
    color: '#e94560',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
  transactionItem: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  transactionCategory: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  transactionDate: {
    color: '#666',
    fontSize: 12,
  },
  transactionDescription: {
    color: '#888',
    fontSize: 14,
    marginBottom: 4,
  },
  transactionMeta: {
    color: '#666',
    fontSize: 12,
    marginBottom: 2,
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2a4e',
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  transactionBalance: {
    color: '#666',
    fontSize: 12,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  playerRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e94560',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playerRankText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  playerRankPosition: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  playerStats: {
    alignItems: 'flex-end',
  },
  playerStatLabel: {
    color: '#666',
    fontSize: 10,
  },
  playerStatValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyContainer: {
    flex: 1,
  },
  historyHeader: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backToPlayersButton: {
    marginBottom: 8,
  },
  backToPlayersText: {
    color: '#e94560',
    fontSize: 14,
  },
  historyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

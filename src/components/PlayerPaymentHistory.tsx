import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { usePlayerFinancials } from '../hooks/useTreasury';
import { formatCurrency } from '../lib/formatters';
import type { Transaction, TransactionCategory } from '../types/treasury';

const CATEGORY_LABELS: Record<TransactionCategory, string> = {
  match_fee: 'Match Fee',
  membership_dues: 'Membership',
  venue_rental: 'Venue Rental',
  trophy_purchase: 'Trophy',
  equipment: 'Equipment',
  payout: 'Payout',
  other: 'Other',
};

interface PlayerPaymentHistoryProps {
  playerId: string;
  playerName?: string;
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const isIncome = transaction.type === 'income';
  const date = new Date(transaction.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <View style={styles.transactionRow}>
      <View style={styles.transactionLeft}>
        <Text style={styles.transactionCategory}>
          {CATEGORY_LABELS[transaction.category]}
        </Text>
        <Text style={styles.transactionDescription} numberOfLines={1}>
          {transaction.description}
        </Text>
        <Text style={styles.transactionDate}>{date}</Text>
      </View>
      <View style={styles.transactionRight}>
        <Text style={[styles.transactionAmount, isIncome ? styles.expenseText : styles.incomeText]}>
          {isIncome ? '-' : '+'}{formatCurrency(transaction.amount)}
        </Text>
        <Text style={styles.balanceAfter}>
          Bal: {formatCurrency(transaction.balance_after)}
        </Text>
      </View>
    </View>
  );
}

export function PlayerPaymentHistory({ playerId, playerName }: PlayerPaymentHistoryProps) {
  const { summary, transactions, loading, refresh } = usePlayerFinancials(playerId);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#e94560" />
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No financial data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>
          {playerName || summary.display_name || 'Player'} Summary
        </Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Match Fees</Text>
            <Text style={styles.statValue}>{formatCurrency(summary.total_match_fees_paid)}</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Winnings</Text>
            <Text style={[styles.statValue, styles.incomeText]}>
              {formatCurrency(summary.total_winnings_received)}
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Membership</Text>
            <Text style={styles.statValue}>{formatCurrency(summary.total_membership_paid)}</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Net</Text>
            <Text style={[styles.statValue, summary.net_contribution >= 0 ? styles.expenseText : styles.incomeText]}>
              {summary.net_contribution >= 0 ? '' : '-'}{formatCurrency(Math.abs(summary.net_contribution))}
            </Text>
          </View>
        </View>
      </View>

      {/* Transactions List */}
      <Text style={styles.sectionTitle}>Transaction History</Text>
      
      <ScrollView
        style={styles.transactionsList}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#e94560" />
        }
      >
        {transactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        ) : (
          transactions.map((transaction) => (
            <TransactionRow key={transaction.id} transaction={transaction} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  summaryCard: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 20,
    margin: 16,
  },
  summaryTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 12,
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
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  transactionsList: {
    flex: 1,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  transactionLeft: {
    flex: 1,
    marginRight: 12,
  },
  transactionCategory: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  transactionDescription: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  transactionDate: {
    color: '#666',
    fontSize: 11,
    marginTop: 4,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  balanceAfter: {
    color: '#666',
    fontSize: 11,
    marginTop: 4,
  },
  incomeText: {
    color: '#2ecc71',
  },
  expenseText: {
    color: '#e74c3c',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
  },
});

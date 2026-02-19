export type TransactionType = 'income' | 'expense';

export type TransactionCategory =
  | 'match_fee'
  | 'membership_dues'
  | 'venue_rental'
  | 'trophy_purchase'
  | 'equipment'
  | 'payout'
  | 'other';

export type ActivityType =
  | 'challenge_sent'
  | 'challenge_accepted'
  | 'challenge_declined'
  | 'challenge_cancelled'
  | 'venue_proposed'
  | 'match_confirmed'
  | 'match_completed'
  | 'score_submitted'
  | 'score_disputed'
  | 'ranking_changed'
  | 'player_joined'
  | 'payment_received';

export interface Transaction {
  id: string;
  player_id: string | null;
  type: TransactionType;
  category: TransactionCategory;
  amount: number; // stored in cents (1000 = $10.00)
  description: string;
  related_match_id: string | null;
  admin_id: string | null;
  created_at: string;
  balance_after: number;
  // Joined fields
  player_name?: string;
  admin_name?: string;
}

export interface PlayerFinancialSummary {
  player_id: string;
  total_match_fees_paid: number;
  total_winnings_received: number;
  total_membership_paid: number;
  net_contribution: number;
  updated_at: string;
  // Joined fields
  display_name?: string;
  rank_position?: number;
}

export interface ActivityItem {
  id: string;
  type: ActivityType;
  actor_player_id: string | null;
  target_player_id: string | null;
  challenge_id: string | null;
  match_id: string | null;
  description: string;
  created_at: string;
  // Joined fields
  actor_name?: string;
  target_name?: string;
  // Additional metadata for rich display
  race_to?: number;
  discipline_id?: string;
  challenger_games?: number;
  challenged_games?: number;
  venue_name?: string;
}

export interface TreasuryStats {
  currentBalance: number;
  totalIncome: number;
  totalExpenses: number;
  net: number;
}

export interface CategoryBreakdown {
  category: TransactionCategory;
  total: number;
  count: number;
}

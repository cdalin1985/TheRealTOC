import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { 
  Transaction, 
  PlayerFinancialSummary, 
  TreasuryStats,
  CategoryBreakdown 
} from '../types/treasury';

export function useTreasury() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<TreasuryStats | null>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async (limit = 50) => {
    try {
      const { data, error: supabaseError } = await supabase
        .from('transactions')
        .select(`
          *,
          player:player_id (profiles:profile_id (display_name)),
          admin:admin_id (display_name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (supabaseError) throw supabaseError;

      const formatted: Transaction[] = (data || []).map((t: any) => ({
        ...t,
        player_name: t.player?.profiles?.display_name,
        admin_name: t.admin?.display_name,
      }));

      setTransactions(formatted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      // Get current balance
      const { data: balanceData, error: balanceError } = await supabase
        .rpc('get_league_balance');
      
      if (balanceError) throw balanceError;

      // Get total income
      const { data: incomeData, error: incomeError } = await supabase
        .rpc('get_total_income');
      
      if (incomeError) throw incomeError;

      // Get total expenses
      const { data: expenseData, error: expenseError } = await supabase
        .rpc('get_total_expenses');
      
      if (expenseError) throw expenseError;

      setStats({
        currentBalance: balanceData || 0,
        totalIncome: incomeData || 0,
        totalExpenses: expenseData || 0,
        net: (incomeData || 0) - (expenseData || 0),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    }
  }, []);

  const fetchCategoryBreakdown = useCallback(async () => {
    try {
      const { data, error: supabaseError } = await supabase
        .from('transactions')
        .select('category, amount, type');

      if (supabaseError) throw supabaseError;

      // Group by category
      const breakdown: Record<string, { total: number; count: number }> = {};
      
      (data || []).forEach((t: any) => {
        if (!breakdown[t.category]) {
          breakdown[t.category] = { total: 0, count: 0 };
        }
        // For breakdown, show positive for income, negative for expense
        const signedAmount = t.type === 'expense' ? -t.amount : t.amount;
        breakdown[t.category].total += signedAmount;
        breakdown[t.category].count += 1;
      });

      const formatted: CategoryBreakdown[] = Object.entries(breakdown).map(
        ([category, stats]) => ({
          category: category as any,
          total: stats.total,
          count: stats.count,
        })
      );

      setCategoryBreakdown(formatted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch breakdown');
    }
  }, []);

  const addExpense = useCallback(async (
    category: string,
    amount: number,
    description: string
  ) => {
    try {
      const { error: supabaseError } = await supabase
        .from('transactions')
        .insert({
          type: 'expense',
          category,
          amount: Math.round(amount * 100), // Convert dollars to cents
          description,
        });

      if (supabaseError) throw supabaseError;

      // Refresh data
      await fetchTransactions();
      await fetchStats();
      await fetchCategoryBreakdown();
      
      return { success: true };
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to add expense' 
      };
    }
  }, [fetchTransactions, fetchStats, fetchCategoryBreakdown]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([
      fetchTransactions(),
      fetchStats(),
      fetchCategoryBreakdown(),
    ]);
    setLoading(false);
  }, [fetchTransactions, fetchStats, fetchCategoryBreakdown]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    transactions,
    stats,
    categoryBreakdown,
    loading,
    error,
    refresh,
    addExpense,
  };
}

export function usePlayerFinancials(playerId: string | null) {
  const [summary, setSummary] = useState<PlayerFinancialSummary | null>(null);
  const [playerTransactions, setPlayerTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlayerData = useCallback(async () => {
    if (!playerId) {
      setLoading(false);
      return;
    }

    try {
      // Get summary
      const { data: summaryData } = await supabase
        .from('player_financial_summary')
        .select(`
          *,
          player:player_id (
            profiles:profile_id (display_name),
            ranks (rank_position)
          )
        `)
        .eq('player_id', playerId)
        .single();

      if (summaryData) {
        setSummary({
          ...summaryData,
          display_name: summaryData.player?.profiles?.display_name,
          rank_position: summaryData.player?.ranks?.[0]?.rank_position,
        });
      }

      // Get player's transactions
      const { data: txData } = await supabase
        .from('transactions')
        .select('*')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false });

      setPlayerTransactions(txData || []);
    } catch (err) {
      console.error('Error fetching player financials:', err);
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    fetchPlayerData();
  }, [fetchPlayerData]);

  return {
    summary,
    transactions: playerTransactions,
    loading,
    refresh: fetchPlayerData,
  };
}

export function useAllPlayerFinancials() {
  const [summaries, setSummaries] = useState<PlayerFinancialSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('player_financial_summary')
        .select(`
          *,
          player:player_id (
            profiles:profile_id (display_name),
            ranks (rank_position)
          )
        `)
        .order('net_contribution', { ascending: false });

      const formatted = (data || []).map((s: any) => ({
        ...s,
        display_name: s.player?.profiles?.display_name,
        rank_position: s.player?.ranks?.[0]?.rank_position,
      }));

      setSummaries(formatted);
    } catch (err) {
      console.error('Error fetching all financials:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { summaries, loading, refresh: fetchAll };
}

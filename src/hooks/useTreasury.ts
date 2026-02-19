import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { 
  Transaction, 
  PlayerFinancialSummary, 
  TreasuryStats,
  CategoryBreakdown 
} from '../types/treasury';

// Cache implementation with AsyncStorage (optional)
let AsyncStorage: any = null;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch {
  console.log('AsyncStorage not available - offline caching disabled');
}

// Cache keys
const CACHE_KEYS = {
  transactions: 'treasury:transactions',
  stats: 'treasury:stats',
  categoryBreakdown: 'treasury:categoryBreakdown',
  playerSummaries: 'treasury:playerSummaries',
  playerFinancials: (playerId: string) => `treasury:player:${playerId}`,
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

async function getCachedData<T>(key: string): Promise<T | null> {
  if (!AsyncStorage) return null;
  
  try {
    const cached = await AsyncStorage.getItem(key);
    if (!cached) return null;
    
    const entry: CacheEntry<T> = JSON.parse(cached);
    const age = Date.now() - entry.timestamp;
    
    if (age > CACHE_TTL) {
      await AsyncStorage.removeItem(key);
      return null;
    }
    
    return entry.data;
  } catch {
    return null;
  }
}

async function setCachedData<T>(key: string, data: T): Promise<void> {
  if (!AsyncStorage) return;
  
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    await AsyncStorage.setItem(key, JSON.stringify(entry));
  } catch (err) {
    console.error('Cache write error:', err);
  }
}

export function useTreasury() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<TreasuryStats | null>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const isMounted = useRef(true);

  const fetchTransactions = useCallback(async (limit = 50, useCache = true) => {
    // Try cache first
    if (useCache) {
      const cached = await getCachedData<Transaction[]>(CACHE_KEYS.transactions);
      if (cached && isMounted.current) {
        setTransactions(cached);
      }
    }

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

      if (isMounted.current) {
        setTransactions(formatted);
        setIsOffline(false);
        await setCachedData(CACHE_KEYS.transactions, formatted);
      }
    } catch (err) {
      if (isMounted.current) {
        // Check if we have cached data to show
        const cached = await getCachedData<Transaction[]>(CACHE_KEYS.transactions);
        if (cached) {
          setIsOffline(true);
        } else {
          setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
        }
      }
    }
  }, []);

  const fetchStats = useCallback(async (useCache = true) => {
    if (useCache) {
      const cached = await getCachedData<TreasuryStats>(CACHE_KEYS.stats);
      if (cached && isMounted.current) {
        setStats(cached);
      }
    }

    try {
      const [{ data: balanceData }, { data: incomeData }, { data: expenseData }] = await Promise.all([
        supabase.rpc('get_league_balance'),
        supabase.rpc('get_total_income'),
        supabase.rpc('get_total_expenses'),
      ]);

      const newStats: TreasuryStats = {
        currentBalance: balanceData || 0,
        totalIncome: incomeData || 0,
        totalExpenses: expenseData || 0,
        net: (incomeData || 0) - (expenseData || 0),
      };

      if (isMounted.current) {
        setStats(newStats);
        setIsOffline(false);
        await setCachedData(CACHE_KEYS.stats, newStats);
      }
    } catch (err) {
      if (isMounted.current) {
        const cached = await getCachedData<TreasuryStats>(CACHE_KEYS.stats);
        if (!cached) {
          setError(err instanceof Error ? err.message : 'Failed to fetch stats');
        } else {
          setIsOffline(true);
        }
      }
    }
  }, []);

  const fetchCategoryBreakdown = useCallback(async (useCache = true) => {
    if (useCache) {
      const cached = await getCachedData<CategoryBreakdown[]>(CACHE_KEYS.categoryBreakdown);
      if (cached && isMounted.current) {
        setCategoryBreakdown(cached);
      }
    }

    try {
      const { data, error: supabaseError } = await supabase
        .from('transactions')
        .select('category, amount, type');

      if (supabaseError) throw supabaseError;

      const breakdown: Record<string, { total: number; count: number }> = {};
      
      (data || []).forEach((t: any) => {
        if (!breakdown[t.category]) {
          breakdown[t.category] = { total: 0, count: 0 };
        }
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

      if (isMounted.current) {
        setCategoryBreakdown(formatted);
        await setCachedData(CACHE_KEYS.categoryBreakdown, formatted);
      }
    } catch (err) {
      console.error('Error fetching category breakdown:', err);
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
          amount: Math.round(amount * 100),
          description,
        });

      if (supabaseError) throw supabaseError;

      // Refresh data (bypass cache)
      await Promise.all([
        fetchTransactions(50, false),
        fetchStats(false),
        fetchCategoryBreakdown(false),
      ]);
      
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
      fetchTransactions(50, false),
      fetchStats(false),
      fetchCategoryBreakdown(false),
    ]);
    setLoading(false);
  }, [fetchTransactions, fetchStats, fetchCategoryBreakdown]);

  useEffect(() => {
    isMounted.current = true;
    
    const loadInitialData = async () => {
      setLoading(true);
      await Promise.all([
        fetchTransactions(),
        fetchStats(),
        fetchCategoryBreakdown(),
      ]);
      if (isMounted.current) {
        setLoading(false);
      }
    };

    loadInitialData();

    return () => {
      isMounted.current = false;
    };
  }, [fetchTransactions, fetchStats, fetchCategoryBreakdown]);

  return {
    transactions,
    stats,
    categoryBreakdown,
    loading,
    error,
    isOffline,
    refresh,
    addExpense,
  };
}

export function usePlayerFinancials(playerId: string | null) {
  const [summary, setSummary] = useState<PlayerFinancialSummary | null>(null);
  const [playerTransactions, setPlayerTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  const fetchPlayerData = useCallback(async (useCache = true) => {
    if (!playerId) {
      setLoading(false);
      return;
    }

    const cacheKey = CACHE_KEYS.playerFinancials(playerId);

    if (useCache) {
      const cached = await getCachedData<{ summary: PlayerFinancialSummary; transactions: Transaction[] }>(cacheKey);
      if (cached && isMounted.current) {
        setSummary(cached.summary);
        setPlayerTransactions(cached.transactions);
      }
    }

    try {
      const [{ data: summaryData }, { data: txData }] = await Promise.all([
        supabase
          .from('player_financial_summary')
          .select(`
            *,
            player:player_id (
              profiles:profile_id (display_name),
              ranks (rank_position)
            )
          `)
          .eq('player_id', playerId)
          .single(),
        supabase
          .from('transactions')
          .select('*')
          .eq('player_id', playerId)
          .order('created_at', { ascending: false }),
      ]);

      if (summaryData && isMounted.current) {
        const formattedSummary = {
          ...summaryData,
          display_name: summaryData.player?.profiles?.display_name,
          rank_position: summaryData.player?.ranks?.[0]?.rank_position,
        };
        setSummary(formattedSummary);
        setPlayerTransactions(txData || []);
        
        await setCachedData(cacheKey, {
          summary: formattedSummary,
          transactions: txData || [],
        });
      }
    } catch (err) {
      console.error('Error fetching player financials:', err);
      // Try to use cached data on error
      const cached = await getCachedData<{ summary: PlayerFinancialSummary; transactions: Transaction[] }>(cacheKey);
      if (cached && isMounted.current) {
        setSummary(cached.summary);
        setPlayerTransactions(cached.transactions);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [playerId]);

  useEffect(() => {
    isMounted.current = true;
    fetchPlayerData();
    return () => {
      isMounted.current = false;
    };
  }, [fetchPlayerData]);

  return {
    summary,
    transactions: playerTransactions,
    loading,
    refresh: () => fetchPlayerData(false),
  };
}

export function useAllPlayerFinancials() {
  const [summaries, setSummaries] = useState<PlayerFinancialSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  const fetchAll = useCallback(async (useCache = true) => {
    if (useCache) {
      const cached = await getCachedData<PlayerFinancialSummary[]>(CACHE_KEYS.playerSummaries);
      if (cached && isMounted.current) {
        setSummaries(cached);
      }
    }

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

      if (isMounted.current) {
        setSummaries(formatted);
        await setCachedData(CACHE_KEYS.playerSummaries, formatted);
      }
    } catch (err) {
      console.error('Error fetching all financials:', err);
      const cached = await getCachedData<PlayerFinancialSummary[]>(CACHE_KEYS.playerSummaries);
      if (cached && isMounted.current) {
        setSummaries(cached);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    fetchAll();
    return () => {
      isMounted.current = false;
    };
  }, [fetchAll]);

  return { summaries, loading, refresh: () => fetchAll(false) };
}

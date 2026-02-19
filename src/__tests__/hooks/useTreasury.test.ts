import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useTreasury, usePlayerFinancials, useAllPlayerFinancials } from '../../hooks/useTreasury';

// Create mock functions
const mockFrom = jest.fn();
const mockRpc = jest.fn();

// Mock supabase module
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    rpc: (...args: any[]) => mockRpc(...args),
  },
}));

const mockQueryBuilder: any = {
  select: jest.fn(() => mockQueryBuilder),
  insert: jest.fn(() => mockQueryBuilder),
  order: jest.fn(() => mockQueryBuilder),
  limit: jest.fn(() => mockQueryBuilder),
  eq: jest.fn(() => mockQueryBuilder),
  single: jest.fn(() => mockQueryBuilder),
};

describe('useTreasury', () => {
  const mockTransaction = {
    id: 'tx-1',
    player_id: 'player-123',
    type: 'income',
    category: 'match_fee',
    amount: 1000,
    description: 'Match fee',
    related_match_id: null,
    admin_id: null,
    created_at: '2024-01-01T00:00:00Z',
    balance_after: 5000,
    player: {
      profiles: { display_name: 'Test Player' },
    },
    admin: { display_name: 'Admin User' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(mockQueryBuilder);
  });

  describe('Initial State & Data Fetching', () => {
    it('should start with loading state', () => {
      mockQueryBuilder.limit.mockResolvedValue({ data: [], error: null });
      mockRpc
        .mockResolvedValueOnce({ data: 5000, error: null })  // balance
        .mockResolvedValueOnce({ data: 10000, error: null }) // income
        .mockResolvedValueOnce({ data: 5000, error: null }); // expenses

      const { result } = renderHook(() => useTreasury());

      expect(result.current.loading).toBe(true);
    });

    it('should fetch transactions on mount', async () => {
      mockQueryBuilder.limit.mockResolvedValue({ data: [mockTransaction], error: null });
      mockRpc
        .mockResolvedValueOnce({ data: 5000, error: null })
        .mockResolvedValueOnce({ data: 10000, error: null })
        .mockResolvedValueOnce({ data: 5000, error: null });

      const { result } = renderHook(() => useTreasury());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockFrom).toHaveBeenCalledWith('transactions');
      expect(result.current.transactions).toHaveLength(1);
      expect(result.current.transactions[0].player_name).toBe('Test Player');
      expect(result.current.transactions[0].admin_name).toBe('Admin User');
    });

    it('should fetch stats on mount', async () => {
      mockQueryBuilder.limit.mockResolvedValue({ data: [], error: null });
      mockRpc
        .mockResolvedValueOnce({ data: 5000, error: null })   // balance
        .mockResolvedValueOnce({ data: 10000, error: null })  // income
        .mockResolvedValueOnce({ data: 3000, error: null });  // expenses

      const { result } = renderHook(() => useTreasury());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.stats).toEqual({
        currentBalance: 5000,
        totalIncome: 10000,
        totalExpenses: 3000,
        net: 7000,
      });
    });

    it('should handle fetch error', async () => {
      mockQueryBuilder.limit.mockRejectedValue({ message: 'Database error' });
      mockRpc
        .mockResolvedValueOnce({ data: 0, error: null })
        .mockResolvedValueOnce({ data: 0, error: null })
        .mockResolvedValueOnce({ data: 0, error: null });

      const { result } = renderHook(() => useTreasury());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('Category Breakdown', () => {
    it('should calculate category breakdown', async () => {
      const transactions = [
        { category: 'match_fee', amount: 1000, type: 'income' },
        { category: 'match_fee', amount: 1000, type: 'income' },
        { category: 'equipment', amount: 500, type: 'expense' },
      ];

      mockQueryBuilder.limit.mockResolvedValue({ data: [], error: null });
      mockQueryBuilder.select.mockResolvedValueOnce({ data: transactions, error: null });
      mockRpc
        .mockResolvedValueOnce({ data: 5000, error: null })
        .mockResolvedValueOnce({ data: 2000, error: null })
        .mockResolvedValueOnce({ data: 500, error: null });

      const { result } = renderHook(() => useTreasury());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const matchFeeCategory = result.current.categoryBreakdown.find(
        (c: any) => c.category === 'match_fee'
      );
      expect(matchFeeCategory).toBeDefined();
      expect(matchFeeCategory?.total).toBe(2000);
      expect(matchFeeCategory?.count).toBe(2);

      const equipmentCategory = result.current.categoryBreakdown.find(
        (c: any) => c.category === 'equipment'
      );
      expect(equipmentCategory).toBeDefined();
      expect(equipmentCategory?.total).toBe(-500); // Negative for expenses
      expect(equipmentCategory?.count).toBe(1);
    });
  });

  describe('Add Expense', () => {
    it('should add expense successfully', async () => {
      mockQueryBuilder.limit.mockResolvedValue({ data: [], error: null });
      mockQueryBuilder.insert.mockResolvedValue({ error: null });
      mockRpc
        .mockResolvedValueOnce({ data: 5000, error: null })
        .mockResolvedValueOnce({ data: 10000, error: null })
        .mockResolvedValueOnce({ data: 5000, error: null });

      const { result } = renderHook(() => useTreasury());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let addResult: any;
      await act(async () => {
        addResult = await result.current.addExpense('equipment', 150.50, 'New cues');
      });

      expect(mockFrom).toHaveBeenCalledWith('transactions');
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith({
        type: 'expense',
        category: 'equipment',
        amount: 15050, // Converted to cents
        description: 'New cues',
      });
      expect(addResult.success).toBe(true);
    });

    it('should handle add expense error', async () => {
      mockQueryBuilder.limit.mockResolvedValue({ data: [], error: null });
      mockQueryBuilder.insert.mockResolvedValue({ 
        error: { message: 'Insufficient funds' } 
      });
      mockRpc
        .mockResolvedValueOnce({ data: 5000, error: null })
        .mockResolvedValueOnce({ data: 10000, error: null })
        .mockResolvedValueOnce({ data: 5000, error: null });

      const { result } = renderHook(() => useTreasury());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let addResult: any;
      await act(async () => {
        addResult = await result.current.addExpense('equipment', 1000, 'Expensive item');
      });

      expect(addResult.success).toBe(false);
      expect(addResult.error).toBe('Insufficient funds');
    });
  });

  describe('Refresh', () => {
    it('should refresh all data', async () => {
      mockQueryBuilder.limit.mockResolvedValue({ data: [], error: null });
      mockRpc
        .mockResolvedValueOnce({ data: 5000, error: null })
        .mockResolvedValueOnce({ data: 10000, error: null })
        .mockResolvedValueOnce({ data: 5000, error: null });

      const { result } = renderHook(() => useTreasury());
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Clear mocks
      jest.clearAllMocks();
      mockFrom.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.order.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.limit.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.limit.mockResolvedValue({ data: [], error: null });
      mockRpc
        .mockResolvedValueOnce({ data: 6000, error: null })
        .mockResolvedValueOnce({ data: 11000, error: null })
        .mockResolvedValueOnce({ data: 5000, error: null });

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockFrom).toHaveBeenCalledWith('transactions');
      expect(result.current.stats?.currentBalance).toBe(6000);
    });
  });
});

describe('usePlayerFinancials', () => {
  const mockPlayerId = 'player-123';
  const mockSummary = {
    player_id: 'player-123',
    total_match_fees_paid: 5000,
    total_winnings_received: 2000,
    total_membership_paid: 1000,
    net_contribution: 4000,
    updated_at: '2024-01-01T00:00:00Z',
    player: {
      profiles: { display_name: 'Test Player' },
      ranks: [{ rank_position: 5 }],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(mockQueryBuilder);
  });

  it('should not load when playerId is null', async () => {
    const { result } = renderHook(() => usePlayerFinancials(null));

    expect(result.current.loading).toBe(false);
    expect(result.current.summary).toBeNull();
  });

  it('should fetch player financial summary', async () => {
    mockQueryBuilder.single
      .mockResolvedValueOnce({ data: mockSummary, error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    const { result } = renderHook(() => usePlayerFinancials(mockPlayerId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.summary).toMatchObject({
      player_id: 'player-123',
      display_name: 'Test Player',
      rank_position: 5,
      total_match_fees_paid: 5000,
      net_contribution: 4000,
    });
  });

  it('should fetch player transactions', async () => {
    const mockTransactions = [
      { id: 'tx-1', amount: 1000, type: 'income' },
      { id: 'tx-2', amount: 500, type: 'expense' },
    ];

    mockQueryBuilder.single
      .mockResolvedValueOnce({ data: mockSummary, error: null })
      .mockResolvedValueOnce({ data: mockTransactions, error: null });

    const { result } = renderHook(() => usePlayerFinancials(mockPlayerId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.transactions).toHaveLength(2);
  });
});

describe('useAllPlayerFinancials', () => {
  const mockSummaries = [
    {
      player_id: 'player-1',
      total_match_fees_paid: 5000,
      total_winnings_received: 2000,
      total_membership_paid: 1000,
      net_contribution: 4000,
      updated_at: '2024-01-01T00:00:00Z',
      player: {
        profiles: { display_name: 'Player One' },
        ranks: [{ rank_position: 1 }],
      },
    },
    {
      player_id: 'player-2',
      total_match_fees_paid: 3000,
      total_winnings_received: 1000,
      total_membership_paid: 1000,
      net_contribution: 3000,
      updated_at: '2024-01-01T00:00:00Z',
      player: {
        profiles: { display_name: 'Player Two' },
        ranks: [{ rank_position: 2 }],
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(mockQueryBuilder);
  });

  it('should fetch all player financial summaries', async () => {
    mockQueryBuilder.order.mockResolvedValue({ data: mockSummaries, error: null });

    const { result } = renderHook(() => useAllPlayerFinancials());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.summaries).toHaveLength(2);
    expect(result.current.summaries[0].display_name).toBe('Player One');
    expect(result.current.summaries[0].rank_position).toBe(1);
    expect(result.current.summaries[1].display_name).toBe('Player Two');
    expect(result.current.summaries[1].rank_position).toBe(2);
  });

  it('should sort by net contribution descending', async () => {
    mockQueryBuilder.order.mockResolvedValue({ data: mockSummaries, error: null });

    const { result } = renderHook(() => useAllPlayerFinancials());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Verify the order call was made correctly
    expect(mockQueryBuilder.order).toHaveBeenCalledWith('net_contribution', { ascending: false });
  });
});

import { renderHook, waitFor } from '@testing-library/react-native';
import { usePlayer } from '../../hooks/usePlayer';

// Create mock functions
const mockFrom = jest.fn();

// Mock supabase module
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

const mockQueryBuilder: any = {
  select: jest.fn(() => mockQueryBuilder),
  eq: jest.fn(() => mockQueryBuilder),
  single: jest.fn(() => mockQueryBuilder),
};

describe('usePlayer', () => {
  const mockUserId = 'user-123';
  const mockPlayer = {
    id: 'player-123',
    profile_id: 'user-123',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };
  const mockRank = {
    id: 'rank-123',
    player_id: 'player-123',
    rank_position: 5,
    points: 100,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(mockQueryBuilder);
  });

  describe('Initial State', () => {
    it('should start with loading state when userId is provided', () => {
      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: mockPlayer, error: null })
        .mockResolvedValueOnce({ data: mockRank, error: null });

      const { result } = renderHook(() => usePlayer(mockUserId));

      expect(result.current.loading).toBe(true);
    });

    it('should not load when userId is null', async () => {
      const { result } = renderHook(() => usePlayer(null));

      expect(result.current.loading).toBe(false);
      expect(result.current.player).toBeNull();
      expect(result.current.rank).toBeNull();
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch player and rank data', async () => {
      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: mockPlayer, error: null })
        .mockResolvedValueOnce({ data: mockRank, error: null });

      const { result } = renderHook(() => usePlayer(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockFrom).toHaveBeenNthCalledWith(1, 'players');
      expect(mockFrom).toHaveBeenNthCalledWith(2, 'ranks');
      expect(result.current.player).toEqual(mockPlayer);
      expect(result.current.rank).toEqual(mockRank);
    });

    it('should handle player without rank', async () => {
      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: mockPlayer, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      const { result } = renderHook(() => usePlayer(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.player).toEqual(mockPlayer);
      expect(result.current.rank).toBeNull();
    });

    it('should handle player not found', async () => {
      mockQueryBuilder.single.mockResolvedValueOnce({ data: null, error: null });

      const { result } = renderHook(() => usePlayer(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.player).toBeNull();
      expect(result.current.rank).toBeNull();
    });

    it('should refetch when userId changes', async () => {
      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: mockPlayer, error: null })
        .mockResolvedValueOnce({ data: mockRank, error: null })
        .mockResolvedValueOnce({ 
          data: { ...mockPlayer, id: 'player-456' }, 
          error: null 
        })
        .mockResolvedValueOnce({ 
          data: { ...mockRank, player_id: 'player-456', rank_position: 3 }, 
          error: null 
        });

      const { result, rerender } = renderHook(
        ({ userId }: { userId: string | null }) => usePlayer(userId),
        { initialProps: { userId: mockUserId } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.player?.id).toBe('player-123');

      rerender({ userId: 'user-456' });

      await waitFor(() => {
        expect(result.current.player?.id).toBe('player-456');
      });

      expect(result.current.rank?.rank_position).toBe(3);
    });
  });
});

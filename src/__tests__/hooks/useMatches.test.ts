import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useMatches } from '../../hooks/useMatches';

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
  or: jest.fn(() => mockQueryBuilder),
  order: jest.fn(() => mockQueryBuilder),
};

describe('useMatches', () => {
  const mockPlayerId = 'player-123';
  
  const mockMatch = {
    id: 'match-1',
    challenge_id: 'challenge-1',
    challenger_player_id: 'player-123',
    challenged_player_id: 'player-456',
    discipline_id: '8-ball',
    race_to: 5,
    venue_id: 'venue-123',
    scheduled_at: '2024-01-15T19:00:00Z',
    status: 'scheduled',
    challenger_games: null,
    challenged_games: null,
    challenger_submitted_at: null,
    challenged_submitted_at: null,
    finalized_at: null,
    livestream_url: null,
    disputed_reason: null,
    winner_player_id: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    challenger: {
      id: 'player-123',
      profile: { display_name: 'Challenger' },
      rank: [{ rank_position: 5 }],
    },
    challenged: {
      id: 'player-456',
      profile: { display_name: 'Challenged' },
      rank: [{ rank_position: 3 }],
    },
    winner: null,
    venue: { name: 'Valley Hub' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(mockQueryBuilder);
  });

  describe('Initial State & Data Fetching', () => {
    it('should start with loading state when playerId is provided', () => {
      mockQueryBuilder.order.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useMatches(mockPlayerId));

      expect(result.current.loading).toBe(true);
    });

    it('should not load when playerId is null', async () => {
      const { result } = renderHook(() => useMatches(null));

      expect(result.current.loading).toBe(false);
      expect(result.current.matches).toEqual([]);
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('should fetch matches for player', async () => {
      mockQueryBuilder.order.mockResolvedValue({ 
        data: [mockMatch], 
        error: null 
      });

      const { result } = renderHook(() => useMatches(mockPlayerId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockFrom).toHaveBeenCalledWith('matches');
      expect(mockQueryBuilder.or).toHaveBeenCalledWith(
        `challenger_player_id.eq.${mockPlayerId},challenged_player_id.eq.${mockPlayerId}`
      );
      expect(result.current.matches).toHaveLength(1);
      expect(result.current.matches[0].challenger_display_name).toBe('Challenger');
      expect(result.current.matches[0].venue_name).toBe('Valley Hub');
    });

    it('should handle fetch error', async () => {
      mockQueryBuilder.order.mockResolvedValue({ 
        data: null, 
        error: { message: 'Database error' } 
      });

      const { result } = renderHook(() => useMatches(mockPlayerId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Database error');
      expect(result.current.matches).toEqual([]);
    });

    it('should format match data correctly', async () => {
      mockQueryBuilder.order.mockResolvedValue({ 
        data: [mockMatch], 
        error: null 
      });

      const { result } = renderHook(() => useMatches(mockPlayerId));

      await waitFor(() => {
        expect(result.current.matches).toHaveLength(1);
      });

      const match = result.current.matches[0];
      expect(match).toMatchObject({
        id: 'match-1',
        challenger_player_id: 'player-123',
        challenged_player_id: 'player-456',
        discipline_id: '8-ball',
        race_to: 5,
        status: 'scheduled',
        challenger_display_name: 'Challenger',
        challenged_display_name: 'Challenged',
        challenger_rank: 5,
        challenged_rank: 3,
        venue_name: 'Valley Hub',
        winner_display_name: null,
      });
    });

    it('should handle match with winner', async () => {
      const matchWithWinner = {
        ...mockMatch,
        status: 'completed',
        winner_player_id: 'player-123',
        challenger_games: 5,
        challenged_games: 3,
        winner: {
          profile: { display_name: 'Challenger' },
        },
      };

      mockQueryBuilder.order.mockResolvedValue({ 
        data: [matchWithWinner], 
        error: null 
      });

      const { result } = renderHook(() => useMatches(mockPlayerId));

      await waitFor(() => {
        expect(result.current.matches).toHaveLength(1);
      });

      expect(result.current.matches[0].winner_display_name).toBe('Challenger');
      expect(result.current.matches[0].challenger_games).toBe(5);
      expect(result.current.matches[0].challenged_games).toBe(3);
    });
  });

  describe('Submit Match Result', () => {
    it('should submit match result successfully', async () => {
      mockQueryBuilder.order.mockResolvedValue({ data: [], error: null });
      mockRpc.mockResolvedValue({
        data: { success: true, status: 'completed' },
        error: null,
      });

      const { result } = renderHook(() => useMatches(mockPlayerId));
      await waitFor(() => expect(result.current.loading).toBe(false));

      let submitResult: any;
      await act(async () => {
        submitResult = await result.current.submitMatchResult('match-1', 5, 3);
      });

      expect(mockRpc).toHaveBeenCalledWith('submit_match_result', {
        p_match_id: 'match-1',
        p_my_games: 5,
        p_opponent_games: 3,
        p_livestream_url: undefined,
      });
      expect(submitResult.success).toBe(true);
      expect(submitResult.status).toBe('completed');
    });

    it('should submit match result with livestream URL', async () => {
      mockQueryBuilder.order.mockResolvedValue({ data: [], error: null });
      mockRpc.mockResolvedValue({
        data: { success: true, status: 'completed' },
        error: null,
      });

      const { result } = renderHook(() => useMatches(mockPlayerId));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.submitMatchResult('match-1', 5, 3, 'https://youtube.com/live/abc');
      });

      expect(mockRpc).toHaveBeenCalledWith('submit_match_result', {
        p_match_id: 'match-1',
        p_my_games: 5,
        p_opponent_games: 3,
        p_livestream_url: 'https://youtube.com/live/abc',
      });
    });

    it('should handle submit error from RPC', async () => {
      mockQueryBuilder.order.mockResolvedValue({ data: [], error: null });
      mockRpc.mockResolvedValue({
        data: { error: 'Match not found' },
        error: null,
      });

      const { result } = renderHook(() => useMatches(mockPlayerId));
      await waitFor(() => expect(result.current.loading).toBe(false));

      let submitResult: any;
      await act(async () => {
        submitResult = await result.current.submitMatchResult('match-1', 5, 3);
      });

      expect(submitResult.success).toBe(false);
      expect(submitResult.error).toBe('Match not found');
    });

    it('should handle database error on submit', async () => {
      mockQueryBuilder.order.mockResolvedValue({ data: [], error: null });
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Connection failed' },
      });

      const { result } = renderHook(() => useMatches(mockPlayerId));
      await waitFor(() => expect(result.current.loading).toBe(false));

      let submitResult: any;
      await act(async () => {
        submitResult = await result.current.submitMatchResult('match-1', 5, 3);
      });

      expect(submitResult.success).toBe(false);
      expect(submitResult.error).toBe('Connection failed');
    });

    it('should handle pending status (waiting for opponent)', async () => {
      mockQueryBuilder.order.mockResolvedValue({ data: [], error: null });
      mockRpc.mockResolvedValue({
        data: { success: true, status: 'scheduled' },
        error: null,
      });

      const { result } = renderHook(() => useMatches(mockPlayerId));
      await waitFor(() => expect(result.current.loading).toBe(false));

      let submitResult: any;
      await act(async () => {
        submitResult = await result.current.submitMatchResult('match-1', 5, 3);
      });

      expect(submitResult.success).toBe(true);
      expect(submitResult.status).toBe('scheduled'); // Waiting for opponent
    });

    it('should handle disputed status', async () => {
      mockQueryBuilder.order.mockResolvedValue({ data: [], error: null });
      mockRpc.mockResolvedValue({
        data: { success: true, status: 'disputed' },
        error: null,
      });

      const { result } = renderHook(() => useMatches(mockPlayerId));
      await waitFor(() => expect(result.current.loading).toBe(false));

      let submitResult: any;
      await act(async () => {
        submitResult = await result.current.submitMatchResult('match-1', 5, 3);
      });

      expect(submitResult.success).toBe(true);
      expect(submitResult.status).toBe('disputed');
    });
  });

  describe('Refresh', () => {
    it('should refresh matches', async () => {
      mockQueryBuilder.order.mockResolvedValue({ 
        data: [mockMatch], 
        error: null 
      });

      const { result } = renderHook(() => useMatches(mockPlayerId));
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Clear mocks to verify refresh calls
      jest.clearAllMocks();
      mockFrom.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.order.mockResolvedValue({ data: [], error: null });

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockFrom).toHaveBeenCalledWith('matches');
    });
  });
});

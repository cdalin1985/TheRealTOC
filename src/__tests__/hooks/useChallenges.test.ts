import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useChallenges } from '../hooks/useChallenges';
import { supabase } from '../lib/supabase';

// Mock supabase
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => mockQueryBuilder),
    rpc: jest.fn(),
  },
}));

const mockQueryBuilder: any = {
  select: jest.fn(() => mockQueryBuilder),
  or: jest.fn(() => mockQueryBuilder),
  order: jest.fn(() => mockQueryBuilder),
};

describe('useChallenges', () => {
  const mockPlayerId = 'player-123';
  
  const mockChallenge = {
    id: 'challenge-1',
    challenger_player_id: 'player-123',
    challenged_player_id: 'player-456',
    discipline_id: '8-ball',
    race_to: 5,
    status: 'pending',
    venue_id: null,
    scheduled_at: null,
    proposed_by_player_id: null,
    locked_at: null,
    created_at: '2024-01-01T00:00:00Z',
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
    venue: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.or.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.order.mockReturnValue(mockQueryBuilder);
  });

  describe('Initial State & Data Fetching', () => {
    it('should start with loading state when playerId is provided', () => {
      mockQueryBuilder.order.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useChallenges(mockPlayerId));

      expect(result.current.loading).toBe(true);
    });

    it('should not load when playerId is null', async () => {
      const { result } = renderHook(() => useChallenges(null));

      expect(result.current.loading).toBe(false);
      expect(result.current.challenges).toEqual([]);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should fetch challenges for player', async () => {
      mockQueryBuilder.order.mockResolvedValue({ 
        data: [mockChallenge], 
        error: null 
      });

      const { result } = renderHook(() => useChallenges(mockPlayerId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(supabase.from).toHaveBeenCalledWith('challenges');
      expect(mockQueryBuilder.or).toHaveBeenCalledWith(
        `challenger_player_id.eq.${mockPlayerId},challenged_player_id.eq.${mockPlayerId}`
      );
      expect(result.current.challenges).toHaveLength(1);
      expect(result.current.challenges[0].challenger_display_name).toBe('Challenger');
      expect(result.current.challenges[0].challenger_rank).toBe(5);
    });

    it('should handle fetch error', async () => {
      mockQueryBuilder.order.mockResolvedValue({ 
        data: null, 
        error: { message: 'Database error' } 
      });

      const { result } = renderHook(() => useChallenges(mockPlayerId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Database error');
      expect(result.current.challenges).toEqual([]);
    });

    it('should format challenge data correctly', async () => {
      mockQueryBuilder.order.mockResolvedValue({ 
        data: [mockChallenge], 
        error: null 
      });

      const { result } = renderHook(() => useChallenges(mockPlayerId));

      await waitFor(() => {
        expect(result.current.challenges).toHaveLength(1);
      });

      const challenge = result.current.challenges[0];
      expect(challenge).toMatchObject({
        id: 'challenge-1',
        challenger_player_id: 'player-123',
        challenged_player_id: 'player-456',
        discipline_id: '8-ball',
        race_to: 5,
        status: 'pending',
        challenger_display_name: 'Challenger',
        challenged_display_name: 'Challenged',
        challenger_rank: 5,
        challenged_rank: 3,
        venue_name: null,
      });
    });
  });

  describe('Create Challenge', () => {
    it('should create challenge successfully', async () => {
      mockQueryBuilder.order.mockResolvedValue({ data: [], error: null });
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: { challenge_id: 'new-challenge-123' },
        error: null,
      });

      const { result } = renderHook(() => useChallenges(mockPlayerId));
      await waitFor(() => expect(result.current.loading).toBe(false));

      let createResult;
      await act(async () => {
        createResult = await result.current.createChallenge('player-456', '8-ball', 5);
      });

      expect(supabase.rpc).toHaveBeenCalledWith('create_challenge', {
        p_challenged_player_id: 'player-456',
        p_discipline_id: '8-ball',
        p_race_to: 5,
      });
      expect(createResult.success).toBe(true);
      expect(createResult.challengeId).toBe('new-challenge-123');
    });

    it('should handle create challenge error from RPC', async () => {
      mockQueryBuilder.order.mockResolvedValue({ data: [], error: null });
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: { error: 'Cannot challenge this player' },
        error: null,
      });

      const { result } = renderHook(() => useChallenges(mockPlayerId));
      await waitFor(() => expect(result.current.loading).toBe(false));

      let createResult;
      await act(async () => {
        createResult = await result.current.createChallenge('player-456', '8-ball', 5);
      });

      expect(createResult.success).toBe(false);
      expect(createResult.error).toBe('Cannot challenge this player');
    });

    it('should handle database error on create', async () => {
      mockQueryBuilder.order.mockResolvedValue({ data: [], error: null });
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Connection failed' },
      });

      const { result } = renderHook(() => useChallenges(mockPlayerId));
      await waitFor(() => expect(result.current.loading).toBe(false));

      let createResult;
      await act(async () => {
        createResult = await result.current.createChallenge('player-456', '8-ball', 5);
      });

      expect(createResult.success).toBe(false);
      expect(createResult.error).toBe('Connection failed');
    });
  });

  describe('Cancel Challenge', () => {
    it('should cancel challenge successfully', async () => {
      mockQueryBuilder.order.mockResolvedValue({ data: [], error: null });
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const { result } = renderHook(() => useChallenges(mockPlayerId));
      await waitFor(() => expect(result.current.loading).toBe(false));

      let cancelResult;
      await act(async () => {
        cancelResult = await result.current.cancelChallenge('challenge-1');
      });

      expect(supabase.rpc).toHaveBeenCalledWith('cancel_challenge', {
        p_challenge_id: 'challenge-1',
      });
      expect(cancelResult.success).toBe(true);
    });

    it('should handle cancel challenge error', async () => {
      mockQueryBuilder.order.mockResolvedValue({ data: [], error: null });
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: { error: 'Challenge not found' },
        error: null,
      });

      const { result } = renderHook(() => useChallenges(mockPlayerId));
      await waitFor(() => expect(result.current.loading).toBe(false));

      let cancelResult;
      await act(async () => {
        cancelResult = await result.current.cancelChallenge('challenge-1');
      });

      expect(cancelResult.success).toBe(false);
      expect(cancelResult.error).toBe('Challenge not found');
    });
  });

  describe('Decline Challenge', () => {
    it('should decline challenge successfully', async () => {
      mockQueryBuilder.order.mockResolvedValue({ data: [], error: null });
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const { result } = renderHook(() => useChallenges(mockPlayerId));
      await waitFor(() => expect(result.current.loading).toBe(false));

      let declineResult;
      await act(async () => {
        declineResult = await result.current.declineChallenge('challenge-1');
      });

      expect(supabase.rpc).toHaveBeenCalledWith('decline_challenge', {
        p_challenge_id: 'challenge-1',
      });
      expect(declineResult.success).toBe(true);
    });
  });

  describe('Propose Challenge Details', () => {
    it('should propose venue and time successfully', async () => {
      mockQueryBuilder.order.mockResolvedValue({ data: [], error: null });
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const { result } = renderHook(() => useChallenges(mockPlayerId));
      await waitFor(() => expect(result.current.loading).toBe(false));

      let proposeResult;
      await act(async () => {
        proposeResult = await result.current.proposeChallengeDetails(
          'challenge-1',
          'venue-123',
          '2024-01-15T19:00:00Z'
        );
      });

      expect(supabase.rpc).toHaveBeenCalledWith('propose_challenge_details', {
        p_challenge_id: 'challenge-1',
        p_venue_id: 'venue-123',
        p_scheduled_at: '2024-01-15T19:00:00Z',
      });
      expect(proposeResult.success).toBe(true);
    });
  });

  describe('Confirm Challenge', () => {
    it('should confirm challenge and return match id', async () => {
      mockQueryBuilder.order.mockResolvedValue({ data: [], error: null });
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: { success: true, match_id: 'match-123' },
        error: null,
      });

      const { result } = renderHook(() => useChallenges(mockPlayerId));
      await waitFor(() => expect(result.current.loading).toBe(false));

      let confirmResult;
      await act(async () => {
        confirmResult = await result.current.confirmChallenge('challenge-1');
      });

      expect(supabase.rpc).toHaveBeenCalledWith('confirm_challenge', {
        p_challenge_id: 'challenge-1',
      });
      expect(confirmResult.success).toBe(true);
      expect(confirmResult.matchId).toBe('match-123');
    });
  });

  describe('Refresh', () => {
    it('should refresh challenges', async () => {
      mockQueryBuilder.order.mockResolvedValue({ 
        data: [mockChallenge], 
        error: null 
      });

      const { result } = renderHook(() => useChallenges(mockPlayerId));
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Clear mocks to verify refresh calls
      jest.clearAllMocks();
      mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.or.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.order.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.order.mockResolvedValue({ data: [], error: null });

      await act(async () => {
        await result.current.refresh();
      });

      expect(supabase.from).toHaveBeenCalledWith('challenges');
    });
  });
});

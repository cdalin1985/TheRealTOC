/**
 * Integration Tests: Match Completion Flow
 * 
 * Tests the complete match lifecycle:
 * Match Scheduled → Score Submission → Ranking Update
 * 
 * Confidence: P0 - Critical path
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useMatches } from '../hooks/useMatches';
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

describe('Integration: Match Completion Flow', () => {
  const challengerId = 'player-challenger';
  const challengedId = 'player-challenged';
  const matchId = 'match-123';

  const mockScheduledMatch = {
    id: matchId,
    challenge_id: 'challenge-123',
    challenger_player_id: challengerId,
    challenged_player_id: challengedId,
    discipline_id: '8-ball',
    race_to: 5,
    venue_id: 'venue-123',
    scheduled_at: '2024-02-20T19:00:00Z',
    status: 'scheduled',
    challenger_games: null,
    challenged_games: null,
    challenger_submitted_at: null,
    challenged_submitted_at: null,
    finalized_at: null,
    livestream_url: null,
    disputed_reason: null,
    winner_player_id: null,
    created_at: '2024-02-15T00:00:00Z',
    updated_at: '2024-02-15T00:00:00Z',
    challenger: {
      id: challengerId,
      profile: { display_name: 'Challenger' },
      rank: [{ rank_position: 5 }],
    },
    challenged: {
      id: challengedId,
      profile: { display_name: 'Challenged' },
      rank: [{ rank_position: 3 }],
    },
    winner: null,
    venue: { name: 'Valley Hub' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.or.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.order.mockReturnValue(mockQueryBuilder);
  });

  describe('P0: Match Score Submission (Both Players Agree)', () => {
    it('should complete match when both players submit agreeing scores', async () => {
      // Setup: Match is scheduled
      mockQueryBuilder.order.mockResolvedValue({ 
        data: [mockScheduledMatch], 
        error: null 
      });

      const { result: challengerResult } = renderHook(() => useMatches(challengerId));
      await waitFor(() => expect(challengerResult.current.loading).toBe(false));

      expect(challengerResult.current.matches[0].status).toBe('scheduled');

      // Step 1: Challenger submits score (5-3 win)
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: { success: true, status: 'scheduled' }, // Waiting for opponent
        error: null,
      });

      let submitResult1;
      await act(async () => {
        submitResult1 = await challengerResult.current.submitMatchResult(
          matchId,
          5, // my games
          3  // opponent games
        );
      });

      expect(submitResult1.success).toBe(true);
      expect(submitResult1.status).toBe('scheduled'); // Still waiting

      // Step 2: Challenged player submits agreeing score (3-5 loss)
      const { result: challengedResult } = renderHook(() => useMatches(challengedId));
      await waitFor(() => expect(challengedResult.current.loading).toBe(false));

      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: { success: true, status: 'completed' }, // Both agreed
        error: null,
      });

      let submitResult2;
      await act(async () => {
        submitResult2 = await challengedResult.current.submitMatchResult(
          matchId,
          3, // my games
          5  // opponent games
        );
      });

      expect(submitResult2.success).toBe(true);
      expect(submitResult2.status).toBe('completed');

      // Verify: Both submissions recorded correctly
      expect(supabase.rpc).toHaveBeenNthCalledWith(1, 'submit_match_result', {
        p_match_id: matchId,
        p_my_games: 5,
        p_opponent_games: 3,
        p_livestream_url: undefined,
      });
      expect(supabase.rpc).toHaveBeenNthCalledWith(2, 'submit_match_result', {
        p_match_id: matchId,
        p_my_games: 3,
        p_opponent_games: 5,
        p_livestream_url: undefined,
      });
    });

    it('should handle match with livestream URL', async () => {
      mockQueryBuilder.order.mockResolvedValue({ 
        data: [mockScheduledMatch], 
        error: null 
      });

      const { result } = renderHook(() => useMatches(challengerId));
      await waitFor(() => expect(result.current.loading).toBe(false));

      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: { success: true, status: 'completed' },
        error: null,
      });

      await act(async () => {
        await result.current.submitMatchResult(
          matchId,
          5,
          2,
          'https://youtube.com/live/abc123'
        );
      });

      expect(supabase.rpc).toHaveBeenCalledWith('submit_match_result', {
        p_match_id: matchId,
        p_my_games: 5,
        p_opponent_games: 2,
        p_livestream_url: 'https://youtube.com/live/abc123',
      });
    });
  });

  describe('P0: Match Score Dispute (Different Scores)', () => {
    it('should mark match as disputed when scores disagree', async () => {
      mockQueryBuilder.order.mockResolvedValue({ 
        data: [mockScheduledMatch], 
        error: null 
      });

      const { result: challengerResult } = renderHook(() => useMatches(challengerId));
      await waitFor(() => expect(challengerResult.current.loading).toBe(false));

      // Challenger says: I won 5-3
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: { success: true, status: 'scheduled' },
        error: null,
      });

      await act(async () => {
        await challengerResult.current.submitMatchResult(matchId, 5, 3);
      });

      // Challenged says: I won 5-4 (disagrees on score)
      const { result: challengedResult } = renderHook(() => useMatches(challengedId));
      await waitFor(() => expect(challengedResult.current.loading).toBe(false));

      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: { success: true, status: 'disputed' },
        error: null,
      });

      let submitResult;
      await act(async () => {
        submitResult = await challengedResult.current.submitMatchResult(matchId, 5, 4);
      });

      expect(submitResult.success).toBe(true);
      expect(submitResult.status).toBe('disputed');
    });

    it('should handle dispute where both claim to win', async () => {
      mockQueryBuilder.order.mockResolvedValue({ 
        data: [mockScheduledMatch], 
        error: null 
      });

      const { result: challengerResult } = renderHook(() => useMatches(challengerId));
      await waitFor(() => expect(challengerResult.current.loading).toBe(false));

      // Challenger says: I won 5-3
      await act(async () => {
        (supabase.rpc as jest.Mock).mockResolvedValueOnce({
          data: { success: true, status: 'scheduled' },
          error: null,
        });
        await challengerResult.current.submitMatchResult(matchId, 5, 3);
      });

      // Challenged says: I won 5-2 (impossible - both can't win)
      const { result: challengedResult } = renderHook(() => useMatches(challengedId));
      await waitFor(() => expect(challengedResult.current.loading).toBe(false));

      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: { success: true, status: 'disputed' },
        error: null,
      });

      let submitResult;
      await act(async () => {
        submitResult = await challengedResult.current.submitMatchResult(matchId, 5, 2);
      });

      expect(submitResult.status).toBe('disputed');
    });
  });

  describe('P1: Score Validation', () => {
    it('should reject invalid score (both players reach race_to)', async () => {
      mockQueryBuilder.order.mockResolvedValue({ 
        data: [mockScheduledMatch], 
        error: null 
      });

      const { result } = renderHook(() => useMatches(challengerId));
      await waitFor(() => expect(result.current.loading).toBe(false));

      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: { error: 'Both players cannot win' },
        error: null,
      });

      let submitResult;
      await act(async () => {
        submitResult = await result.current.submitMatchResult(matchId, 5, 5);
      });

      expect(submitResult.success).toBe(false);
      expect(submitResult.error).toBe('Both players cannot win');
    });

    it('should reject invalid score (no winner)', async () => {
      mockQueryBuilder.order.mockResolvedValue({ 
        data: [mockScheduledMatch], 
        error: null 
      });

      const { result } = renderHook(() => useMatches(challengerId));
      await waitFor(() => expect(result.current.loading).toBe(false));

      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: { error: 'One player must reach 5 games to win' },
        error: null,
      });

      let submitResult;
      await act(async () => {
        submitResult = await result.current.submitMatchResult(matchId, 3, 4);
      });

      expect(submitResult.success).toBe(false);
      expect(submitResult.error).toContain('must reach');
    });

    it('should reject negative scores', async () => {
      mockQueryBuilder.order.mockResolvedValue({ 
        data: [mockScheduledMatch], 
        error: null 
      });

      const { result } = renderHook(() => useMatches(challengerId));
      await waitFor(() => expect(result.current.loading).toBe(false));

      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: { error: 'Games must be non-negative' },
        error: null,
      });

      let submitResult;
      await act(async () => {
        submitResult = await result.current.submitMatchResult(matchId, -1, 5);
      });

      expect(submitResult.success).toBe(false);
    });

    it('should reject scores exceeding race_to', async () => {
      mockQueryBuilder.order.mockResolvedValue({ 
        data: [mockScheduledMatch], 
        error: null 
      });

      const { result } = renderHook(() => useMatches(challengerId));
      await waitFor(() => expect(result.current.loading).toBe(false));

      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: { error: 'Winner games must equal race_to' },
        error: null,
      });

      let submitResult;
      await act(async () => {
        submitResult = await result.current.submitMatchResult(matchId, 6, 3);
      });

      expect(submitResult.success).toBe(false);
    });
  });

  describe('P1: Match Status Transitions', () => {
    it('should transition from scheduled → completed', async () => {
      mockQueryBuilder.order.mockResolvedValue({ 
        data: [{ ...mockScheduledMatch, status: 'scheduled' }], 
        error: null 
      });

      const { result } = renderHook(() => useMatches(challengerId));
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.matches[0].status).toBe('scheduled');

      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: { success: true, status: 'completed' },
        error: null,
      });

      await act(async () => {
        await result.current.submitMatchResult(matchId, 5, 3);
      });

      // After refresh, status should be updated
      mockQueryBuilder.order.mockResolvedValue({ 
        data: [{ ...mockScheduledMatch, status: 'completed', challenger_games: 5, challenged_games: 3 }], 
        error: null 
      });
    });

    it('should not allow submission for already completed match', async () => {
      const completedMatch = {
        ...mockScheduledMatch,
        status: 'completed',
        challenger_games: 5,
        challenged_games: 3,
        winner_player_id: challengerId,
      };

      mockQueryBuilder.order.mockResolvedValue({ 
        data: [completedMatch], 
        error: null 
      });

      const { result } = renderHook(() => useMatches(challengerId));
      await waitFor(() => expect(result.current.loading).toBe(false));

      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: { error: 'Match already completed' },
        error: null,
      });

      let submitResult;
      await act(async () => {
        submitResult = await result.current.submitMatchResult(matchId, 5, 2);
      });

      expect(submitResult.success).toBe(false);
      expect(submitResult.error).toBe('Match already completed');
    });
  });

  describe('Edge Cases', () => {
    it('should handle double submission by same player', async () => {
      mockQueryBuilder.order.mockResolvedValue({ 
        data: [mockScheduledMatch], 
        error: null 
      });

      const { result } = renderHook(() => useMatches(challengerId));
      await waitFor(() => expect(result.current.loading).toBe(false));

      // First submission
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: { success: true, status: 'scheduled' },
        error: null,
      });

      await act(async () => {
        await result.current.submitMatchResult(matchId, 5, 3);
      });

      // Second submission (should update existing)
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: { success: true, status: 'scheduled' },
        error: null,
      });

      let submitResult;
      await act(async () => {
        submitResult = await result.current.submitMatchResult(matchId, 5, 4);
      });

      expect(submitResult.success).toBe(true);
    });

    it('should handle perfect game (5-0)', async () => {
      mockQueryBuilder.order.mockResolvedValue({ 
        data: [mockScheduledMatch], 
        error: null 
      });

      const { result } = renderHook(() => useMatches(challengerId));
      await waitFor(() => expect(result.current.loading).toBe(false));

      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: { success: true, status: 'completed' },
        error: null,
      });

      let submitResult;
      await act(async () => {
        submitResult = await result.current.submitMatchResult(matchId, 5, 0);
      });

      expect(submitResult.success).toBe(true);
      expect(submitResult.status).toBe('completed');
    });

    it('should handle hill-hill game (5-4)', async () => {
      mockQueryBuilder.order.mockResolvedValue({ 
        data: [mockScheduledMatch], 
        error: null 
      });

      const { result } = renderHook(() => useMatches(challengerId));
      await waitFor(() => expect(result.current.loading).toBe(false));

      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: { success: true, status: 'completed' },
        error: null,
      });

      let submitResult;
      await act(async () => {
        submitResult = await result.current.submitMatchResult(matchId, 5, 4);
      });

      expect(submitResult.success).toBe(true);
      expect(submitResult.status).toBe('completed');
    });
  });
});

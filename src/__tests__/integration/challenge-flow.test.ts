/**
 * Integration Tests: Challenge Flow
 * 
 * Tests the complete challenge lifecycle:
 * Create Challenge → Venue Proposal → Confirmation → Match Creation
 * 
 * Confidence: P0 - Critical path
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useChallenges } from '../../hooks/useChallenges';

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

describe('Integration: Challenge Flow', () => {
  const challengerId = 'player-challenger';
  const challengedId = 'player-challenged';
  const challengeId = 'challenge-123';
  const matchId = 'match-123';
  const venueId = 'venue-valley-hub';

  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(mockQueryBuilder);
  });

  describe('P0: Challenge Creation and Acceptance', () => {
    it('should complete full challenge flow: create → propose → confirm → match', async () => {
      // Setup: Initial empty challenges list
      mockQueryBuilder.order.mockResolvedValue({ data: [], error: null });

      const { result: challengerResult } = renderHook(() => useChallenges(challengerId));
      await waitFor(() => expect(challengerResult.current.loading).toBe(false));

      // Step 1: Challenger creates challenge
      mockRpc.mockResolvedValueOnce({
        data: { challenge_id: challengeId },
        error: null,
      });

      let createResult: any;
      await act(async () => {
        createResult = await challengerResult.current.createChallenge(
          challengedId,
          '8-ball',
          5
        );
      });

      expect(createResult.success).toBe(true);
      expect(createResult.challengeId).toBe(challengeId);

      // Step 2: Challenged player proposes venue and time
      mockRpc.mockResolvedValueOnce({
        data: { success: true },
        error: null,
      });

      const { result: challengedResult } = renderHook(() => useChallenges(challengedId));
      await waitFor(() => expect(challengedResult.current.loading).toBe(false));

      let proposeResult: any;
      await act(async () => {
        proposeResult = await challengedResult.current.proposeChallengeDetails(
          challengeId,
          venueId,
          '2024-02-20T19:00:00Z'
        );
      });

      expect(proposeResult.success).toBe(true);

      // Step 3: Challenger confirms the challenge
      mockRpc.mockResolvedValueOnce({
        data: { success: true, match_id: matchId },
        error: null,
      });

      let confirmResult: any;
      await act(async () => {
        confirmResult = await challengerResult.current.confirmChallenge(challengeId);
      });

      expect(confirmResult.success).toBe(true);
      expect(confirmResult.matchId).toBe(matchId);

      // Verify: Challenge status progression
      expect(mockRpc).toHaveBeenNthCalledWith(1, 'create_challenge', {
        p_challenged_player_id: challengedId,
        p_discipline_id: '8-ball',
        p_race_to: 5,
      });
      expect(mockRpc).toHaveBeenNthCalledWith(2, 'propose_challenge_details', {
        p_challenge_id: challengeId,
        p_venue_id: venueId,
        p_scheduled_at: '2024-02-20T19:00:00Z',
      });
      expect(mockRpc).toHaveBeenNthCalledWith(3, 'confirm_challenge', {
        p_challenge_id: challengeId,
      });
    });

    it('should handle challenge decline', async () => {
      mockQueryBuilder.order.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useChallenges(challengedId));
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Challenged player declines
      mockRpc.mockResolvedValueOnce({
        data: { success: true },
        error: null,
      });

      let declineResult: any;
      await act(async () => {
        declineResult = await result.current.declineChallenge(challengeId);
      });

      expect(declineResult.success).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith('decline_challenge', {
        p_challenge_id: challengeId,
      });
    });

    it('should handle challenge cancellation by challenger', async () => {
      mockQueryBuilder.order.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useChallenges(challengerId));
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Challenger cancels
      mockRpc.mockResolvedValueOnce({
        data: { success: true },
        error: null,
      });

      let cancelResult: any;
      await act(async () => {
        cancelResult = await result.current.cancelChallenge(challengeId);
      });

      expect(cancelResult.success).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith('cancel_challenge', {
        p_challenge_id: challengeId,
      });
    });
  });

  describe('P0: Challenge Validation', () => {
    it('should reject challenge creation with invalid discipline', async () => {
      mockQueryBuilder.order.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useChallenges(challengerId));
      await waitFor(() => expect(result.current.loading).toBe(false));

      mockRpc.mockResolvedValueOnce({
        data: { error: 'Invalid discipline' },
        error: null,
      });

      let createResult: any;
      await act(async () => {
        createResult = await result.current.createChallenge(challengedId, 'snooker', 5);
      });

      expect(createResult.success).toBe(false);
      expect(createResult.error).toBe('Invalid discipline');
    });

    it('should reject challenge creation with invalid race_to', async () => {
      mockQueryBuilder.order.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useChallenges(challengerId));
      await waitFor(() => expect(result.current.loading).toBe(false));

      mockRpc.mockResolvedValueOnce({
        data: { error: 'Race must be at least 5' },
        error: null,
      });

      let createResult: any;
      await act(async () => {
        createResult = await result.current.createChallenge(challengedId, '8-ball', 3);
      });

      expect(createResult.success).toBe(false);
      expect(createResult.error).toBe('Race must be at least 5');
    });

    it('should reject self-challenge', async () => {
      mockQueryBuilder.order.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useChallenges(challengerId));
      await waitFor(() => expect(result.current.loading).toBe(false));

      mockRpc.mockResolvedValueOnce({
        data: { error: 'Cannot challenge yourself' },
        error: null,
      });

      let createResult: any;
      await act(async () => {
        createResult = await result.current.createChallenge(challengerId, '8-ball', 5);
      });

      expect(createResult.success).toBe(false);
      expect(createResult.error).toBe('Cannot challenge yourself');
    });

    it('should reject challenge with rank difference too large', async () => {
      mockQueryBuilder.order.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useChallenges(challengerId));
      await waitFor(() => expect(result.current.loading).toBe(false));

      mockRpc.mockResolvedValueOnce({
        data: { error: 'Rank difference too large. Maximum allowed: 5, actual: 7' },
        error: null,
      });

      let createResult: any;
      await act(async () => {
        createResult = await result.current.createChallenge(challengedId, '8-ball', 5);
      });

      expect(createResult.success).toBe(false);
      expect(createResult.error).toContain('Rank difference too large');
    });
  });

  describe('P1: Venue Negotiation', () => {
    it('should handle venue counter-proposal', async () => {
      mockQueryBuilder.order.mockResolvedValue({ data: [], error: null });

      const { result: challengerResult } = renderHook(() => useChallenges(challengerId));
      await waitFor(() => expect(challengerResult.current.loading).toBe(false));

      // Initial proposal by challenged
      mockRpc
        .mockResolvedValueOnce({ data: { success: true }, error: null })
        .mockResolvedValueOnce({ data: { success: true }, error: null });

      // Challenger counters with different venue
      let counterResult: any;
      await act(async () => {
        counterResult = await challengerResult.current.proposeChallengeDetails(
          challengeId,
          'venue-eagles-4040',
          '2024-02-21T20:00:00Z'
        );
      });

      expect(counterResult.success).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle network error during challenge creation', async () => {
      mockQueryBuilder.order.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useChallenges(challengerId));
      await waitFor(() => expect(result.current.loading).toBe(false));

      mockRpc.mockRejectedValueOnce(
        new Error('Network error')
      );

      let createResult: any;
      await act(async () => {
        createResult = await result.current.createChallenge(challengedId, '8-ball', 5);
      });

      expect(createResult.success).toBe(false);
      expect(createResult.error).toBe('Network error');
    });

    it('should handle expired challenge', async () => {
      mockQueryBuilder.order.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useChallenges(challengerId));
      await waitFor(() => expect(result.current.loading).toBe(false));

      mockRpc.mockResolvedValueOnce({
        data: { error: 'Challenge has expired' },
        error: null,
      });

      let confirmResult: any;
      await act(async () => {
        confirmResult = await result.current.confirmChallenge(challengeId);
      });

      expect(confirmResult.success).toBe(false);
      expect(confirmResult.error).toBe('Challenge has expired');
    });
  });
});

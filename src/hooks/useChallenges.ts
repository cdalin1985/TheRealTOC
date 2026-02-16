import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Challenge, ChallengeStatus } from '../types/database';
import type { DisciplineId } from '../lib/constants';

interface ChallengeWithDetails extends Challenge {
  challenger_display_name: string;
  challenged_display_name: string;
  challenger_rank: number | null;
  challenged_rank: number | null;
  venue_name: string | null;
}

interface ChallengesState {
  challenges: ChallengeWithDetails[];
  loading: boolean;
  error: string | null;
}

export function useChallenges(playerId: string | null) {
  const [state, setState] = useState<ChallengesState>({
    challenges: [],
    loading: true,
    error: null,
  });

  const fetchChallenges = useCallback(async () => {
    if (!playerId) {
      setState({ challenges: [], loading: false, error: null });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    const { data, error } = await supabase
      .from('challenges')
      .select(`
        *,
        challenger:players!challenges_challenger_player_id_fkey (
          id,
          profile:profiles!players_profile_id_fkey (display_name),
          rank:ranks (rank_position)
        ),
        challenged:players!challenges_challenged_player_id_fkey (
          id,
          profile:profiles!players_profile_id_fkey (display_name),
          rank:ranks (rank_position)
        ),
        venue:venues (name)
      `)
      .or(`challenger_player_id.eq.${playerId},challenged_player_id.eq.${playerId}`)
      .order('created_at', { ascending: false });

    if (error) {
      setState({ challenges: [], loading: false, error: error.message });
      return;
    }

    const formattedChallenges: ChallengeWithDetails[] = (data || []).map((c: any) => ({
      id: c.id,
      challenger_player_id: c.challenger_player_id,
      challenged_player_id: c.challenged_player_id,
      discipline_id: c.discipline_id,
      race_to: c.race_to,
      status: c.status,
      venue_id: c.venue_id,
      scheduled_at: c.scheduled_at,
      proposed_by_player_id: c.proposed_by_player_id,
      locked_at: c.locked_at,
      created_at: c.created_at,
      challenger_display_name: c.challenger?.profile?.display_name || 'Unknown',
      challenged_display_name: c.challenged?.profile?.display_name || 'Unknown',
      challenger_rank: c.challenger?.rank?.[0]?.rank_position ?? null,
      challenged_rank: c.challenged?.rank?.[0]?.rank_position ?? null,
      venue_name: c.venue?.name ?? null,
    }));

    setState({ challenges: formattedChallenges, loading: false, error: null });
  }, [playerId]);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  const createChallenge = async (
    challengedPlayerId: string,
    disciplineId: DisciplineId,
    raceTo: number
  ): Promise<{ success: boolean; error?: string; challengeId?: string }> => {
    const { data, error } = await supabase.rpc('create_challenge', {
      p_challenged_player_id: challengedPlayerId,
      p_discipline_id: disciplineId,
      p_race_to: raceTo,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const result = data as { challenge_id?: string; error?: string };

    if (result.error) {
      return { success: false, error: result.error };
    }

    await fetchChallenges();
    return { success: true, challengeId: result.challenge_id };
  };

  const cancelChallenge = async (
    challengeId: string
  ): Promise<{ success: boolean; error?: string }> => {
    const { data, error } = await supabase.rpc('cancel_challenge', {
      p_challenge_id: challengeId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const result = data as { success?: boolean; error?: string };

    if (result.error) {
      return { success: false, error: result.error };
    }

    await fetchChallenges();
    return { success: true };
  };

  const declineChallenge = async (
    challengeId: string
  ): Promise<{ success: boolean; error?: string }> => {
    const { data, error } = await supabase.rpc('decline_challenge', {
      p_challenge_id: challengeId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const result = data as { success?: boolean; error?: string };

    if (result.error) {
      return { success: false, error: result.error };
    }

    await fetchChallenges();
    return { success: true };
  };

  const proposeChallengeDetails = async (
    challengeId: string,
    venueId: string,
    scheduledAt: string
  ): Promise<{ success: boolean; error?: string }> => {
    const { data, error } = await supabase.rpc('propose_challenge_details', {
      p_challenge_id: challengeId,
      p_venue_id: venueId,
      p_scheduled_at: scheduledAt,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const result = data as { success?: boolean; error?: string };

    if (result.error) {
      return { success: false, error: result.error };
    }

    await fetchChallenges();
    return { success: true };
  };

  const confirmChallenge = async (
    challengeId: string
  ): Promise<{ success: boolean; error?: string; matchId?: string }> => {
    const { data, error } = await supabase.rpc('confirm_challenge', {
      p_challenge_id: challengeId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const result = data as { success?: boolean; error?: string; match_id?: string };

    if (result.error) {
      return { success: false, error: result.error };
    }

    await fetchChallenges();
    return { success: true, matchId: result.match_id };
  };

  return {
    ...state,
    refresh: fetchChallenges,
    createChallenge,
    cancelChallenge,
    declineChallenge,
    proposeChallengeDetails,
    confirmChallenge,
  };
}

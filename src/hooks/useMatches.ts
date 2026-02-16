import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Match, MatchStatus } from '../types/database';

interface MatchWithDetails extends Match {
  challenger_display_name: string;
  challenged_display_name: string;
  challenger_rank: number | null;
  challenged_rank: number | null;
  venue_name: string;
  winner_display_name: string | null;
}

interface MatchesState {
  matches: MatchWithDetails[];
  loading: boolean;
  error: string | null;
}

export function useMatches(playerId: string | null) {
  const [state, setState] = useState<MatchesState>({
    matches: [],
    loading: true,
    error: null,
  });

  const fetchMatches = useCallback(async () => {
    if (!playerId) {
      setState({ matches: [], loading: false, error: null });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    const { data, error } = await supabase
      .from('matches')
      .select(`
        *,
        challenger:players!matches_challenger_player_id_fkey (
          id,
          profile:profiles!players_profile_id_fkey (display_name),
          rank:ranks (rank_position)
        ),
        challenged:players!matches_challenged_player_id_fkey (
          id,
          profile:profiles!players_profile_id_fkey (display_name),
          rank:ranks (rank_position)
        ),
        winner:players!matches_winner_player_id_fkey (
          profile:profiles!players_profile_id_fkey (display_name)
        ),
        venue:venues (name)
      `)
      .or(`challenger_player_id.eq.${playerId},challenged_player_id.eq.${playerId}`)
      .order('scheduled_at', { ascending: false });

    if (error) {
      setState({ matches: [], loading: false, error: error.message });
      return;
    }

    const formattedMatches: MatchWithDetails[] = (data || []).map((m: any) => ({
      id: m.id,
      challenge_id: m.challenge_id,
      challenger_player_id: m.challenger_player_id,
      challenged_player_id: m.challenged_player_id,
      discipline_id: m.discipline_id,
      race_to: m.race_to,
      venue_id: m.venue_id,
      scheduled_at: m.scheduled_at,
      status: m.status,
      challenger_games: m.challenger_games,
      challenged_games: m.challenged_games,
      challenger_submitted_at: m.challenger_submitted_at,
      challenged_submitted_at: m.challenged_submitted_at,
      finalized_at: m.finalized_at,
      livestream_url: m.livestream_url,
      disputed_reason: m.disputed_reason,
      winner_player_id: m.winner_player_id,
      created_at: m.created_at,
      updated_at: m.updated_at,
      challenger_display_name: m.challenger?.profile?.display_name || 'Unknown',
      challenged_display_name: m.challenged?.profile?.display_name || 'Unknown',
      challenger_rank: m.challenger?.rank?.[0]?.rank_position ?? null,
      challenged_rank: m.challenged?.rank?.[0]?.rank_position ?? null,
      venue_name: m.venue?.name || 'Unknown',
      winner_display_name: m.winner?.profile?.display_name || null,
    }));

    setState({ matches: formattedMatches, loading: false, error: null });
  }, [playerId]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const submitMatchResult = async (
    matchId: string,
    myGames: number,
    opponentGames: number,
    livestreamUrl?: string
  ): Promise<{ success: boolean; error?: string; status?: MatchStatus }> => {
    const { data, error } = await supabase.rpc('submit_match_result', {
      p_match_id: matchId,
      p_my_games: myGames,
      p_opponent_games: opponentGames,
      p_livestream_url: livestreamUrl,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const result = data as { success?: boolean; error?: string; status?: MatchStatus };

    if (result.error) {
      return { success: false, error: result.error };
    }

    await fetchMatches();
    return { success: true, status: result.status };
  };

  return {
    ...state,
    refresh: fetchMatches,
    submitMatchResult,
  };
}

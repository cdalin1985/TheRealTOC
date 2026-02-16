import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Player, Rank } from '../types/database';

interface PlayerState {
  player: Player | null;
  rank: Rank | null;
  loading: boolean;
}

export function usePlayer(userId: string | null) {
  const [state, setState] = useState<PlayerState>({
    player: null,
    rank: null,
    loading: true,
  });

  useEffect(() => {
    if (!userId) {
      setState({ player: null, rank: null, loading: false });
      return;
    }

    const fetchPlayerData = async () => {
      setState(prev => ({ ...prev, loading: true }));

      // Fetch player
      const { data: playerData } = await supabase
        .from('players')
        .select('*')
        .eq('profile_id', userId)
        .single();

      if (!playerData) {
        setState({ player: null, rank: null, loading: false });
        return;
      }

      // Fetch rank
      const { data: rankData } = await supabase
        .from('ranks')
        .select('*')
        .eq('player_id', playerData.id)
        .single();

      setState({
        player: playerData,
        rank: rankData || null,
        loading: false,
      });
    };

    fetchPlayerData();
  }, [userId]);

  return state;
}

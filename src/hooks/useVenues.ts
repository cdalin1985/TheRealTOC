import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Venue } from '../types/database';

interface VenuesState {
  venues: Venue[];
  loading: boolean;
  error: string | null;
}

export function useVenues() {
  const [state, setState] = useState<VenuesState>({
    venues: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchVenues = async () => {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .order('name');

      if (error) {
        setState({ venues: [], loading: false, error: error.message });
        return;
      }

      setState({ venues: data || [], loading: false, error: null });
    };

    fetchVenues();
  }, []);

  return state;
}

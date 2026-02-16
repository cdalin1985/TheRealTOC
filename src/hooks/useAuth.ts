import { useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    loading: true,
  });

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
        loading: false,
      }));

      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
        }));

        if (session?.user) {
          await ensureProfileAndPlayer();
          fetchProfile(session.user.id);
        } else {
          setState(prev => ({ ...prev, profile: null }));
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) {
      setState(prev => ({ ...prev, profile: data }));
    }
  };

  const ensureProfileAndPlayer = async () => {
    const { error } = await supabase.rpc('ensure_profile_and_player');
    if (error) {
      console.error('Error ensuring profile and player:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const updateProfile = async (updates: { display_name?: string | null; avatar_url?: string | null }) => {
    if (!state.user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', state.user.id);

    if (!error) {
      await fetchProfile(state.user.id);
    }

    return { error };
  };

  const needsProfileSetup = (): boolean => {
    if (!state.profile) return false;
    const displayName = state.profile.display_name;
    return !displayName || displayName.startsWith('Player_');
  };

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    updateProfile,
    needsProfileSetup,
    refreshProfile: () => state.user && fetchProfile(state.user.id),
  };
}

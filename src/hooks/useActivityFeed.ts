import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { ActivityItem, ActivityType } from '../types/treasury';

export function useActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async (limit = 50, beforeId?: string) => {
    try {
      let query = supabase
        .from('activity_log')
        .select(`
          *,
          actor:actor_player_id (profiles:profile_id (display_name)),
          target:target_player_id (profiles:profile_id (display_name))
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (beforeId) {
        const { data: beforeActivity } = await supabase
          .from('activity_log')
          .select('created_at')
          .eq('id', beforeId)
          .single();
        
        if (beforeActivity) {
          query = query.lt('created_at', beforeActivity.created_at);
        }
      }

      const { data, error: supabaseError } = await query;

      if (supabaseError) throw supabaseError;

      const formatted: ActivityItem[] = (data || []).map((a: any) => ({
        ...a,
        actor_name: a.actor?.profiles?.display_name,
        target_name: a.target?.profiles?.display_name,
      }));

      setHasMore(formatted.length === limit);
      
      if (beforeId) {
        setActivities(prev => [...prev, ...formatted]);
      } else {
        setActivities(formatted);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch activities');
    }
  }, []);

  const loadMore = useCallback(() => {
    if (activities.length > 0 && hasMore) {
      fetchActivities(50, activities[activities.length - 1].id);
    }
  }, [activities, hasMore, fetchActivities]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    await fetchActivities();
    setLoading(false);
  }, [fetchActivities]);

  // Real-time subscription
  useEffect(() => {
    const subscription = supabase
      .channel('activity_log_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_log' },
        (payload) => {
          // Add new activity to top of list
          const newActivity = payload.new as ActivityItem;
          setActivities(prev => [newActivity, ...prev]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    activities,
    loading,
    hasMore,
    error,
    refresh,
    loadMore,
  };
}

export function useFilteredActivityFeed(typeFilter?: ActivityType) {
  const { activities, loading, hasMore, error, refresh, loadMore } = useActivityFeed();
  
  const filteredActivities = typeFilter
    ? activities.filter(a => a.type === typeFilter)
    : activities;

  return {
    activities: filteredActivities,
    loading,
    hasMore,
    error,
    refresh,
    loadMore,
  };
}

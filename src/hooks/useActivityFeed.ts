import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActivityItem, ActivityType } from '../types/treasury';

const ACTIVITY_CACHE_KEY = '@activity_feed_cache';
const CACHE_TIMESTAMP_KEY = '@activity_feed_cache_time';
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

interface UseActivityFeedOptions {
  playerId?: string | null;
  pageSize?: number;
}

export function useActivityFeed(options: UseActivityFeedOptions = {}) {
  const { playerId, pageSize = 50 } = options;
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  
  // Track last fetched timestamp for pagination
  const lastTimestampRef = useRef<string | null>(null);
  const subscriptionRef = useRef<any>(null);

  // Load cached activities on mount
  useEffect(() => {
    loadCachedActivities();
  }, []);

  const loadCachedActivities = async () => {
    try {
      const [cachedData, cachedTime] = await Promise.all([
        AsyncStorage.getItem(ACTIVITY_CACHE_KEY),
        AsyncStorage.getItem(CACHE_TIMESTAMP_KEY),
      ]);

      if (cachedData && cachedTime) {
        const age = Date.now() - parseInt(cachedTime, 10);
        if (age < CACHE_MAX_AGE_MS) {
          const parsed = JSON.parse(cachedData);
          setActivities(parsed);
          setIsOffline(true); // Start with cached data, mark as offline until fresh fetch
        }
      }
    } catch (err) {
      console.error('Failed to load cached activities:', err);
    }
  };

  const saveToCache = async (data: ActivityItem[]) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(ACTIVITY_CACHE_KEY, JSON.stringify(data)),
        AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString()),
      ]);
    } catch (err) {
      console.error('Failed to cache activities:', err);
    }
  };

  const fetchActivities = useCallback(async (isLoadMore = false) => {
    try {
      setError(null);
      
      if (!isLoadMore) {
        setLoading(true);
        lastTimestampRef.current = null;
      }

      let query = supabase
        .from('activity_log')
        .select(`
          *,
          actor:actor_player_id (profiles:profile_id (display_name)),
          target:target_player_id (profiles:profile_id (display_name)),
          challenge:challenge_id (race_to, discipline_id),
          match:match_id (challenger_games, challenged_games, venue:venue_id (name))
        `)
        .order('created_at', { ascending: false })
        .limit(pageSize);

      // For pagination, fetch items before the last timestamp
      if (isLoadMore && lastTimestampRef.current) {
        query = query.lt('created_at', lastTimestampRef.current);
      }

      const { data, error: supabaseError } = await query;

      if (supabaseError) throw supabaseError;

      const formatted: ActivityItem[] = (data || []).map((a: any) => ({
        id: a.id,
        type: a.type as ActivityType,
        actor_player_id: a.actor_player_id,
        target_player_id: a.target_player_id,
        challenge_id: a.challenge_id,
        match_id: a.match_id,
        description: a.description,
        created_at: a.created_at,
        actor_name: a.actor?.profiles?.display_name,
        target_name: a.target?.profiles?.display_name,
        // Additional metadata for rich display
        race_to: a.challenge?.race_to,
        discipline_id: a.challenge?.discipline_id,
        challenger_games: a.match?.challenger_games,
        challenged_games: a.match?.challenged_games,
        venue_name: a.match?.venue?.name,
      }));

      // Update pagination state
      setHasMore(formatted.length === pageSize);
      
      // Update last timestamp for next pagination
      if (formatted.length > 0) {
        lastTimestampRef.current = formatted[formatted.length - 1].created_at;
      }

      if (isLoadMore) {
        setActivities(prev => {
          const newActivities = [...prev, ...formatted];
          saveToCache(newActivities);
          return newActivities;
        });
      } else {
        setActivities(formatted);
        saveToCache(formatted);
        setIsOffline(false);
      }
    } catch (err) {
      console.error('Fetch activities error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch activities');
      // Keep existing activities on error (they might be cached)
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pageSize]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchActivities(false);
  }, [fetchActivities]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchActivities(true);
    }
  }, [loading, hasMore, fetchActivities]);

  // Real-time subscription with enhanced handling
  useEffect(() => {
    if (!playerId) return;

    // Clean up existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    subscriptionRef.current = supabase
      .channel(`activity_feed:${playerId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'activity_log',
        },
        async (payload) => {
          const newActivity = payload.new as any;
          
          // Fetch full activity details with joins
          const { data } = await supabase
            .from('activity_log')
            .select(`
              *,
              actor:actor_player_id (profiles:profile_id (display_name)),
              target:target_player_id (profiles:profile_id (display_name)),
              challenge:challenge_id (race_to, discipline_id),
              match:match_id (challenger_games, challenged_games, venue:venue_id (name))
            `)
            .eq('id', newActivity.id)
            .single();

          if (data) {
            const formatted: ActivityItem = {
              id: data.id,
              type: data.type as ActivityType,
              actor_player_id: data.actor_player_id,
              target_player_id: data.target_player_id,
              challenge_id: data.challenge_id,
              match_id: data.match_id,
              description: data.description,
              created_at: data.created_at,
              actor_name: data.actor?.profiles?.display_name,
              target_name: data.target?.profiles?.display_name,
              race_to: data.challenge?.race_to,
              discipline_id: data.challenge?.discipline_id,
              challenger_games: data.match?.challenger_games,
              challenged_games: data.match?.challenged_games,
              venue_name: data.match?.venue?.name,
            };

            setActivities(prev => {
              // Avoid duplicates
              if (prev.some(a => a.id === formatted.id)) return prev;
              const updated = [formatted, ...prev];
              saveToCache(updated);
              return updated;
            });

            // Check if this activity requires a push notification for current user
            checkAndTriggerNotification(formatted, playerId);
          }
        }
      )
      .subscribe();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [playerId]);

  // Initial fetch
  useEffect(() => {
    fetchActivities(false);
  }, [fetchActivities]);

  return {
    activities,
    loading,
    refreshing,
    hasMore,
    error,
    isOffline,
    refresh,
    loadMore,
  };
}

// Hook for filtered activities
export function useFilteredActivityFeed(
  options: UseActivityFeedOptions & { typeFilter?: ActivityType | null } = {}
) {
  const { typeFilter, ...feedOptions } = options;
  const feed = useActivityFeed(feedOptions);
  
  const filteredActivities = typeFilter
    ? feed.activities.filter(a => a.type === typeFilter)
    : feed.activities;

  return {
    ...feed,
    activities: filteredActivities,
  };
}

// Notification types that require push notification
const NOTIFICATION_TRIGGERING_TYPES: ActivityType[] = [
  'challenge_sent',
  'challenge_accepted',
  'challenge_declined',
  'match_confirmed',
  'score_submitted',
  'score_disputed',
];

// Check if activity should trigger push notification for current user
function checkAndTriggerNotification(activity: ActivityItem, currentPlayerId: string) {
  // Only notify for specific activity types
  if (!NOTIFICATION_TRIGGERING_TYPES.includes(activity.type)) return;

  // Check if current user is the target of this activity
  const isTarget = activity.target_player_id === currentPlayerId;
  const isActor = activity.actor_player_id === currentPlayerId;

  // Don't notify for own actions
  if (isActor && !isTarget) return;

  // Determine notification content based on type
  let title = '';
  let body = '';

  switch (activity.type) {
    case 'challenge_sent':
      if (isTarget) {
        title = 'New Challenge!';
        body = `${activity.actor_name || 'Someone'} challenged you to a match`;
      }
      break;
    case 'challenge_accepted':
      if (isTarget || activity.actor_player_id === currentPlayerId) {
        title = 'Challenge Accepted';
        body = `${activity.actor_name || 'Your opponent'} accepted your challenge`;
      }
      break;
    case 'challenge_declined':
      if (isTarget || activity.actor_player_id === currentPlayerId) {
        title = 'Challenge Declined';
        body = `${activity.actor_name || 'Your opponent'} declined your challenge`;
      }
      break;
    case 'match_confirmed':
      title = 'Match Scheduled';
      body = `Your match is confirmed for ${formatTime(activity.created_at)}`;
      break;
    case 'score_submitted':
      if (isTarget) {
        title = 'Score Submitted';
        body = `${activity.actor_name || 'Your opponent'} submitted match scores. Confirm now?`;
      }
      break;
    case 'score_disputed':
      title = 'Score Disputed';
      body = 'A match score has been disputed and is under admin review';
      break;
  }

  if (title && body) {
    // Trigger push notification
    // This will be handled by the push notification service
    triggerPushNotification({
      title,
      body,
      data: {
        activityId: activity.id,
        type: activity.type,
        challengeId: activity.challenge_id,
        matchId: activity.match_id,
      },
    });
  }
}

// Push notification trigger (placeholder - integrate with your push service)
async function triggerPushNotification(notification: {
  title: string;
  body: string;
  data: Record<string, any>;
}) {
  // TODO: Integrate with Expo Notifications or your push service
  // Example:
  // await Notifications.scheduleNotificationAsync({
  //   content: notification,
  //   trigger: null, // Immediate
  // });
  
  // For now, just log - the actual implementation depends on your push setup
  console.log('[Push Notification]', notification);
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

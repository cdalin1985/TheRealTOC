import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { usePlayer } from '../hooks/usePlayer';
import { useFilteredActivityFeed } from '../hooks/useActivityFeed';
import { AnimatedButton } from '../components/AnimatedButton';
import { AnimatedCard } from '../components/AnimatedCard';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { FeedbackToast } from '../components/FeedbackToast';
import type { RootStackParamList } from '../types/navigation';
import type { ActivityItem, ActivityType } from '../types/treasury';
import { DISCIPLINES, type DisciplineId } from '../lib/constants';
import { COLORS, TYPOGRAPHY } from '../lib/animations';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ActivityFeed'>;
};

type FilterTab = 'all' | 'matches' | 'challenges' | 'rankings';

interface FilterConfig {
  key: FilterTab;
  label: string;
  types: ActivityType[] | null;
}

const FILTERS: FilterConfig[] = [
  { key: 'all', label: 'All', types: null },
  { 
    key: 'matches', 
    label: 'Matches', 
    types: ['match_confirmed', 'match_completed', 'score_submitted', 'score_disputed'] 
  },
  { 
    key: 'challenges', 
    label: 'Challenges', 
    types: ['challenge_sent', 'challenge_accepted', 'challenge_declined', 'challenge_cancelled', 'venue_proposed'] 
  },
  { 
    key: 'rankings', 
    label: 'Rankings', 
    types: ['ranking_changed', 'player_joined'] 
  },
];

// Format timestamp for display (like Telegram/WhatsApp)
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  if (diffDays === 1) {
    return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  }
  
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Get activity display text based on type
function getActivityText(activity: ActivityItem): { main: string; sub?: string } {
  const actor = activity.actor_name || 'Someone';
  const target = activity.target_name || 'someone';
  
  switch (activity.type) {
    case 'challenge_sent':
      return {
        main: `${actor} challenged ${target}`,
        sub: activity.discipline_id && activity.race_to 
          ? `${DISCIPLINES[activity.discipline_id as DisciplineId] || activity.discipline_id}, Race to ${activity.race_to}`
          : undefined,
      };
    
    case 'challenge_accepted':
      return {
        main: `${actor} accepted the challenge`,
        sub: 'Match is being scheduled',
      };
    
    case 'challenge_declined':
      return {
        main: `${actor} declined the challenge`,
        sub: activity.description || undefined,
      };
    
    case 'challenge_cancelled':
      return {
        main: `${actor} cancelled the challenge`,
      };
    
    case 'venue_proposed':
      return {
        main: `${actor} proposed match details`,
        sub: activity.venue_name || activity.description || undefined,
      };
    
    case 'match_confirmed':
      return {
        main: `Match confirmed`,
        sub: activity.venue_name 
          ? `At ${activity.venue_name}`
          : activity.description || undefined,
      };
    
    case 'match_completed':
      const score = activity.challenger_games !== null && activity.challenged_games !== null
        ? `${activity.challenger_games}-${activity.challenged_games}`
        : null;
      return {
        main: score 
          ? `${actor} beat ${target} ${score}`
          : `${actor} defeated ${target}`,
        sub: activity.venue_name || undefined,
      };
    
    case 'score_submitted':
      return {
        main: `${actor} submitted scores`,
        sub: 'Waiting for confirmation',
      };
    
    case 'score_disputed':
      return {
        main: `Score disputed`,
        sub: 'Under admin review',
      };
    
    case 'ranking_changed':
      return {
        main: `${actor} moved up in rankings`,
        sub: activity.description || undefined,
      };
    
    case 'player_joined':
      return {
        main: `${actor} joined the league`,
      };
    
    case 'payment_received':
      return {
        main: `Payment received`,
        sub: activity.description || undefined,
      };
    
    default:
      return {
        main: activity.description || 'Activity occurred',
      };
  }
}

// Check if activity is "important"
function isImportantActivity(activity: ActivityItem): boolean {
  return [
    'match_completed',
    'ranking_changed',
    'score_disputed',
  ].includes(activity.type);
}

// Activity message component - chat bubble style with animation
function ActivityMessage({ activity, index }: { activity: ActivityItem; index: number }) {
  const { main, sub } = getActivityText(activity);
  const isImportant = isImportantActivity(activity);
  
  return (
    <AnimatedCard 
      style={[
        styles.messageContainer, 
        isImportant && styles.importantMessage
      ]}
      index={index}
    >
      <View style={styles.messageContent}>
        <Text style={styles.messageText}>
          {main.split(/(\w+)/).map((part, i) => {
            const isName = part === activity.actor_name || part === activity.target_name;
            return isName ? (
              <Text key={i} style={styles.nameHighlight}>{part}</Text>
            ) : (
              part
            );
          })}
        </Text>
        {sub && <Text style={styles.subText}>{sub}</Text>}
      </View>
      <Text style={styles.timestamp}>{formatTimestamp(activity.created_at)}</Text>
    </AnimatedCard>
  );
}

// Date separator component
function DateSeparator({ date }: { date: string }) {
  const dateObj = new Date(date);
  const now = new Date();
  const isToday = dateObj.toDateString() === now.toDateString();
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = yesterday.toDateString() === dateObj.toDateString();
  
  let label = dateObj.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  if (isToday) label = 'Today';
  if (isYesterday) label = 'Yesterday';
  
  return (
    <View style={styles.dateSeparator}>
      <View style={styles.dateLine} />
      <Text style={styles.dateText}>{label}</Text>
      <View style={styles.dateLine} />
    </View>
  );
}

export function ActivityFeedScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { player } = usePlayer(user?.id ?? null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  const currentFilter = FILTERS.find(f => f.key === activeFilter)!;
  
  const {
    activities,
    loading,
    refreshing,
    hasMore,
    error,
    isOffline,
    refresh,
    loadMore,
  } = useFilteredActivityFeed({
    playerId: player?.id ?? null,
    pageSize: 50,
  });

  // Show error toast
  React.useEffect(() => {
    if (error) {
      setToastMessage(error);
      setToastVisible(true);
    }
  }, [error]);

  // Client-side filtering
  const filteredActivities = currentFilter.types
    ? activities.filter(a => currentFilter.types?.includes(a.type))
    : activities;

  // Group activities by date for separators
  const renderItem = useCallback(({ item, index }: { item: ActivityItem; index: number }) => {
    const showDateSeparator = index === 0 || 
      new Date(item.created_at).toDateString() !== 
      new Date(filteredActivities[index - 1]?.created_at).toDateString();
    
    return (
      <>
        {showDateSeparator && <DateSeparator date={item.created_at} />}
        <ActivityMessage activity={item} index={index} />
      </>
    );
  }, [filteredActivities]);

  const renderFilterTab = (filter: FilterConfig) => (
    <AnimatedButton
      key={filter.key}
      variant={activeFilter === filter.key ? 'primary' : 'secondary'}
      size="small"
      onPress={() => setActiveFilter(filter.key)}
      style={styles.filterTab}
    >
      {filter.label}
    </AnimatedButton>
  );

  const renderFooter = () => {
    if (!hasMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={COLORS.PRIMARY} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Error Toast */}
      <FeedbackToast
        visible={toastVisible}
        type="error"
        message={toastMessage}
        onHide={() => setToastVisible(false)}
      />

      {/* Header */}
      <View style={styles.header}>
        <AnimatedButton
          variant="ghost"
          size="small"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          ← Back
        </AnimatedButton>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Activity</Text>
          {isOffline && <Text style={styles.offlineIndicator}>Offline</Text>}
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <View style={styles.filterRow}>
          {FILTERS.map(renderFilterTab)}
        </View>
      </View>

      {/* Activity List */}
      {loading && !refreshing && activities.length === 0 ? (
        <LoadingSkeleton count={5} />
      ) : error && activities.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <AnimatedButton
            variant="primary"
            onPress={refresh}
            style={styles.retryButton}
          >
            Retry
          </AnimatedButton>
        </View>
      ) : filteredActivities.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No activity yet</Text>
          <Text style={styles.emptySubtext}>Check back later for updates</Text>
        </View>
      ) : (
        <FlatList
          data={filteredActivities}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={COLORS.PRIMARY}
              colors={[COLORS.PRIMARY]}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
          }}
        />
      )}
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
    backgroundColor: COLORS.SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  backButton: {
    width: 60,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    ...TYPOGRAPHY.H4,
  },
  offlineIndicator: {
    fontSize: 11,
    color: COLORS.WARNING,
    marginTop: 2,
  },
  filterContainer: {
    backgroundColor: COLORS.SURFACE,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 8,
  },
  filterTab: {
    borderRadius: 16,
  },
  listContent: {
    paddingVertical: 8,
  },
  // Chat-style message styling
  messageContainer: {
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 0,
    backgroundColor: 'transparent',
  },
  importantMessage: {
    backgroundColor: 'rgba(233, 69, 96, 0.08)',
  },
  messageContent: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: 12,
    maxWidth: width * 0.85,
  },
  messageText: {
    ...TYPOGRAPHY.BODY,
    lineHeight: 20,
  },
  nameHighlight: {
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  subText: {
    ...TYPOGRAPHY.BODY_SMALL,
    marginTop: 4,
    lineHeight: 18,
  },
  timestamp: {
    ...TYPOGRAPHY.CAPTION,
    marginTop: 4,
    marginLeft: 4,
  },
  // Date separator
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.BORDER,
  },
  dateText: {
    ...TYPOGRAPHY.CAPTION,
    marginHorizontal: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Loading and empty states
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    color: COLORS.ERROR,
    ...TYPOGRAPHY.BODY,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    minWidth: 120,
  },
  emptyText: {
    ...TYPOGRAPHY.H4,
  },
  emptySubtext: {
    ...TYPOGRAPHY.BODY_SMALL,
    marginTop: 8,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

export default ActivityFeedScreen;

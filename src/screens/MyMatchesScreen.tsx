import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Animated,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { usePlayer } from '../hooks/usePlayer';
import { useMatches } from '../hooks/useMatches';
import { Header, AnimatedCard, LoadingSkeleton, AnimatedButton } from '../components';
import { COLORS, TYPOGRAPHY, SPACING, ANIMATION } from '../lib/animations';
import { DISCIPLINES, MATCH_STATUSES, type DisciplineId } from '../lib/constants';
import type { RootStackParamList } from '../types/navigation';
import type { MatchStatus } from '../types/database';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'MyMatches'>;
};

type FilterType = 'all' | 'scheduled' | 'completed' | 'disputed';

const FILTER_CONFIG: Record<FilterType, { label: string }> = {
  all: { label: 'All' },
  scheduled: { label: 'Scheduled' },
  completed: { label: 'Completed' },
  disputed: { label: 'Disputed' },
};

function FilterButton({
  type,
  isActive,
  onPress,
}: {
  type: FilterType;
  isActive: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scale, {
      toValue: ANIMATION.SCALE.PRESSED,
      duration: ANIMATION.DURATION.FAST,
      easing: ANIMATION.EASING.PRESS,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scale, {
      toValue: 1,
      duration: ANIMATION.DURATION.FAST,
      easing: ANIMATION.EASING.STANDARD,
      useNativeDriver: true,
    }).start();
  };

  const config = FILTER_CONFIG[type];

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[
          styles.filterButton,
          isActive && styles.filterButtonActive,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <Text
          style={[
            styles.filterText,
            isActive && styles.filterTextActive,
          ]}
        >
          {config.label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function MatchCard({
  item,
  index,
  onPress,
  playerId,
}: {
  item: any;
  index: number;
  onPress: () => void;
  playerId: string | undefined;
}) {
  const isChallenger = item.challenger_player_id === playerId;
  const hasSubmitted = isChallenger
    ? item.challenger_submitted_at !== null
    : item.challenged_submitted_at !== null;

  const getStatusColor = (status: MatchStatus) => {
    switch (status) {
      case 'scheduled':
        return COLORS.INFO;
      case 'in_progress':
        return COLORS.WARNING;
      case 'completed':
        return COLORS.SUCCESS;
      case 'disputed':
        return COLORS.ERROR;
      case 'cancelled':
        return COLORS.TEXT_TERTIARY;
      default:
        return COLORS.TEXT_TERTIARY;
    }
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <AnimatedCard index={index} style={styles.matchCard}>
        <View style={styles.matchHeader}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Text style={styles.statusText}>{MATCH_STATUSES[item.status]}</Text>
          </View>
          <Text style={styles.discipline}>
            {DISCIPLINES[item.discipline_id as DisciplineId]}
          </Text>
        </View>

        <View style={styles.playersRow}>
          <View style={styles.playerCol}>
            <Text style={styles.playerName} numberOfLines={1}>
              {item.challenger_display_name}
            </Text>
            <Text style={styles.playerRank}>#{item.challenger_rank ?? '?'}</Text>
            {item.status === 'completed' && (
              <Text style={styles.score}>{item.challenger_games}</Text>
            )}
          </View>
          <Text style={styles.vs}>vs</Text>
          <View style={styles.playerCol}>
            <Text style={styles.playerName} numberOfLines={1}>
              {item.challenged_display_name}
            </Text>
            <Text style={styles.playerRank}>#{item.challenged_rank ?? '?'}</Text>
            {item.status === 'completed' && (
              <Text style={styles.score}>{item.challenged_games}</Text>
            )}
          </View>
        </View>

        <View style={styles.detailsRow}>
          <Text style={styles.venueText} numberOfLines={1}>{item.venue_name}</Text>
          <Text style={styles.dateText}>
            {new Date(item.scheduled_at).toLocaleDateString()}
          </Text>
        </View>

        {item.status === 'scheduled' && (
          <View style={styles.submissionStatus}>
            <Text
              style={[
                styles.submissionText,
                hasSubmitted && styles.submitted,
              ]}
            >
              {hasSubmitted ? '✓ You submitted' : 'Awaiting your score'}
            </Text>
          </View>
        )}

        {item.winner_display_name && (
          <View style={styles.winnerRow}>
            <Text style={styles.winnerLabel}>Winner:</Text>
            <Text style={styles.winnerName}>{item.winner_display_name}</Text>
          </View>
        )}
      </AnimatedCard>
    </TouchableOpacity>
  );
}

export function MyMatchesScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { player } = usePlayer(user?.id ?? null);
  const { matches, loading, refresh } = useMatches(player?.id ?? null);
  const [filter, setFilter] = useState<FilterType>('all');

  const headerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerOpacity, {
      toValue: 1,
      duration: ANIMATION.DURATION.SLOW,
      easing: ANIMATION.EASING.STANDARD,
      useNativeDriver: true,
    }).start();
  }, []);

  const filteredMatches = matches.filter((match) => {
    if (filter === 'all') return true;
    if (filter === 'scheduled') return match.status === 'scheduled';
    if (filter === 'completed') return match.status === 'completed';
    if (filter === 'disputed') return match.status === 'disputed';
    return true;
  });

  const renderMatch = ({ item, index }: { item: any; index: number }) => (
    <MatchCard
      item={item}
      index={index}
      playerId={player?.id}
      onPress={() => navigation.navigate('MatchDetail', { matchId: item.id })}
    />
  );

  return (
    <View style={styles.container}>
      <Header title="My Matches" onBack={() => navigation.goBack()} />

      <Animated.View
        style={[
          styles.filters,
          { opacity: headerOpacity },
        ]}
      >
        {(Object.keys(FILTER_CONFIG) as FilterType[]).map((type) => (
          <FilterButton
            key={type}
            type={type}
            isActive={filter === type}
            onPress={() => setFilter(type)}
          />
        ))}
      </Animated.View>

      {loading && matches.length === 0 ? (
        <LoadingSkeleton count={3} />
      ) : filteredMatches.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No matches found</Text>
          <AnimatedButton
            onPress={() => navigation.navigate('CreateChallenge')}
            style={styles.createButton}
          >
            Create Challenge
          </AnimatedButton>
        </View>
      ) : (
        <FlatList
          data={filteredMatches}
          keyExtractor={(item) => item.id}
          renderItem={renderMatch}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refresh}
              tintColor={COLORS.PRIMARY}
              colors={[COLORS.PRIMARY]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.MD,
    marginBottom: SPACING.MD,
    gap: SPACING.SM,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
  },
  filterButtonActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  filterText: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
  },
  filterTextActive: {
    color: COLORS.TEXT_PRIMARY,
  },
  list: {
    paddingHorizontal: SPACING.MD,
    paddingBottom: SPACING.LG,
  },
  matchCard: {
    padding: SPACING.MD,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: '600',
  },
  discipline: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 14,
  },
  playersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  playerCol: {
    flex: 1,
    alignItems: 'center',
  },
  playerName: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  playerRank: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 12,
    marginTop: 2,
  },
  score: {
    color: COLORS.PRIMARY,
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  vs: {
    color: COLORS.TEXT_TERTIARY,
    fontSize: 14,
    marginHorizontal: SPACING.SM,
    fontWeight: '600',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  venueText: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 12,
    maxWidth: 120,
  },
  dateText: {
    color: COLORS.TEXT_TERTIARY,
    fontSize: 12,
  },
  submissionStatus: {
    marginTop: SPACING.SM,
    paddingTop: SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  submissionText: {
    color: COLORS.WARNING,
    fontSize: 12,
    textAlign: 'center',
  },
  submitted: {
    color: COLORS.SUCCESS,
  },
  winnerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.SM,
    paddingTop: SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  winnerLabel: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 12,
    marginRight: 4,
  },
  winnerName: {
    color: COLORS.SUCCESS,
    fontSize: 12,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.LG,
  },
  emptyText: {
    ...TYPOGRAPHY.BODY,
    marginBottom: SPACING.LG,
  },
  createButton: {
    minWidth: 200,
  },
});

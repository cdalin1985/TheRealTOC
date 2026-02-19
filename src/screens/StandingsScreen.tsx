import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Header, NavButton } from '../components/Header';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { AnimatedCard } from '../components/AnimatedCard';
import { COLORS, TYPOGRAPHY, SPACING, ANIMATION } from '../lib/animations';
import type { RootStackParamList } from '../types/navigation';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Standings'>;
};

interface RankWithPlayer {
  id: string;
  rank_position: number;
  points: number;
  player_id: string;
  display_name: string;
}

function RankItem({
  item,
  index,
  isCurrentUser,
}: {
  item: RankWithPlayer;
  index: number;
  isCurrentUser: boolean;
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

  return (
    <AnimatedCard index={index} style={[styles.rankItem, isCurrentUser && styles.rankItemCurrent]}>
      <View style={styles.rankPosition}>
        <Text style={styles.rankNumber}>#{item.rank_position}</Text>
      </View>
      <View style={styles.playerInfo}>
        <Text style={styles.playerName} numberOfLines={1}>
          {item.display_name}
          {isCurrentUser && <Text style={styles.youBadge}> (You)</Text>}
        </Text>
        <Text style={styles.points}>{item.points} pts</Text>
      </View>
    </AnimatedCard>
  );
}

export function StandingsScreen({ navigation }: Props) {
  const [rankings, setRankings] = useState<RankWithPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { profile, signOut, user } = useAuth();

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: ANIMATION.DURATION.SLOW,
        easing: ANIMATION.EASING.STANDARD,
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: 0,
        duration: ANIMATION.DURATION.ENTRANCE,
        delay: 100,
        easing: ANIMATION.EASING.ENTER,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const fetchRankings = useCallback(async () => {
    const { data, error } = await supabase
      .from('ranks')
      .select(`
        id,
        rank_position,
        points,
        player_id,
        players!inner (
          profile_id,
          profiles!inner (
            display_name
          )
        )
      `)
      .order('rank_position', { ascending: true });

    if (error) {
      console.error('Error fetching rankings:', error);
      return;
    }

    const formattedData: RankWithPlayer[] = (data || []).map((rank: any) => ({
      id: rank.id,
      rank_position: rank.rank_position,
      points: rank.points,
      player_id: rank.player_id,
      display_name: rank.players?.profiles?.display_name || 'Unknown',
    }));

    setRankings(formattedData);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchRankings().finally(() => setLoading(false));
  }, [fetchRankings]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRankings();
    setRefreshing(false);
  }, [fetchRankings]);

  const handleSignOut = async () => {
    await signOut();
  };

  const renderRankItem = ({ item, index }: { item: RankWithPlayer; index: number }) => {
    const isCurrentUser = profile?.id === item.player_id;
    return (
      <RankItem
        item={item}
        index={index}
        isCurrentUser={isCurrentUser}
      />
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="The List"
        rightElement={
          <TouchableOpacity
            onPress={handleSignOut}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="log-out-outline" size={24} color={COLORS.PRIMARY} />
          </TouchableOpacity>
        }
      />

      <Animated.View
        style={[
          styles.welcomeSection,
          {
            opacity: headerOpacity,
          },
        ]}
      >
        {profile && (
          <Text style={styles.welcome}>
            Welcome, <Text style={styles.welcomeName}>{profile.display_name}</Text>
          </Text>
        )}
      </Animated.View>

      <Animated.View
        style={[
          styles.navButtons,
          {
            opacity: headerOpacity,
          },
        ]}
      >
        <NavButton
          label="New Challenge"
          onPress={() => navigation.navigate('CreateChallenge')}
          variant="primary"
          icon="add-circle-outline"
        />
        <NavButton
          label="Challenges"
          onPress={() => navigation.navigate('MyChallenges')}
          icon="trophy-outline"
        />
        <NavButton
          label="Matches"
          onPress={() => navigation.navigate('MyMatches')}
          icon="game-controller-outline"
        />
      </Animated.View>

      <Animated.View
        style={[
          {
            opacity: headerOpacity,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.treasuryButton}
          onPress={() => navigation.navigate('Treasury')}
          activeOpacity={0.8}
        >
          <Ionicons name="cash-outline" size={20} color={COLORS.TEXT_PRIMARY} />
          <Text style={styles.treasuryButtonText}>View League Treasury</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.TEXT_SECONDARY} />
        </TouchableOpacity>
      </Animated.View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: headerOpacity,
            transform: [{ translateY: contentTranslateY }],
          },
        ]}
      >
        {loading ? (
          <LoadingSkeleton count={5} />
        ) : rankings.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="list-outline" size={48} color={COLORS.TEXT_TERTIARY} />
            <Text style={styles.emptyText}>No rankings yet</Text>
            <Text style={styles.emptySubtext}>Be the first to join The List!</Text>
          </View>
        ) : (
          <FlatList
            data={rankings}
            keyExtractor={(item) => item.id}
            renderItem={renderRankItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={COLORS.PRIMARY}
                colors={[COLORS.PRIMARY]}
              />
            }
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  welcomeSection: {
    paddingHorizontal: SPACING.LG,
    marginBottom: SPACING.MD,
  },
  welcome: {
    ...TYPOGRAPHY.BODY_SMALL,
    color: COLORS.TEXT_SECONDARY,
  },
  welcomeName: {
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
  },
  navButtons: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.MD,
    marginBottom: SPACING.MD,
    gap: SPACING.SM,
  },
  treasuryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.SUCCESS,
    marginHorizontal: SPACING.MD,
    marginBottom: SPACING.MD,
    padding: SPACING.MD,
    borderRadius: 12,
    gap: SPACING.SM,
  },
  treasuryButtonText: {
    ...TYPOGRAPHY.BODY,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  list: {
    paddingHorizontal: SPACING.MD,
    paddingBottom: SPACING.LG,
  },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.MD,
    marginBottom: SPACING.SM,
  },
  rankItemCurrent: {
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
  },
  rankPosition: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  rankNumber: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: 'bold',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  youBadge: {
    color: COLORS.PRIMARY,
    fontWeight: '400',
  },
  points: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 14,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.LG,
  },
  emptyText: {
    ...TYPOGRAPHY.H4,
    marginTop: SPACING.MD,
    marginBottom: SPACING.XS,
  },
  emptySubtext: {
    ...TYPOGRAPHY.BODY_SMALL,
    textAlign: 'center',
  },
});

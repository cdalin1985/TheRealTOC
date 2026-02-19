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
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Header, NavButton, AnimatedCard, LoadingSkeleton } from '../components';
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
  return (
    <AnimatedCard 
      index={index} 
      style={[
        styles.rankItem, 
        isCurrentUser && styles.rankItemCurrent
      ]}
    >
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
  const { profile, signOut } = useAuth();

  const headerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerOpacity, {
      toValue: 1,
      duration: ANIMATION.DURATION.SLOW,
      easing: ANIMATION.EASING.STANDARD,
      useNativeDriver: true,
    }).start();
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
            <Text style={styles.signOut}>Sign Out</Text>
          </TouchableOpacity>
        }
      />

      <Animated.View
        style={[
          styles.welcomeSection,
          { opacity: headerOpacity },
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
          { opacity: headerOpacity },
        ]}
      >
        <NavButton
          label="New Challenge"
          onPress={() => navigation.navigate('CreateChallenge')}
          variant="primary"
        />
        <NavButton
          label="Challenges"
          onPress={() => navigation.navigate('MyChallenges')}
        />
        <NavButton
          label="Matches"
          onPress={() => navigation.navigate('MyMatches')}
        />
      </Animated.View>

      <Animated.View style={{ opacity: headerOpacity }}>
        <TouchableOpacity
          style={styles.treasuryButton}
          onPress={() => navigation.navigate('Treasury')}
          activeOpacity={0.8}
        >
          <Text style={styles.treasuryButtonText}>💰 View League Treasury</Text>
        </TouchableOpacity>
      </Animated.View>

      {loading ? (
        <LoadingSkeleton count={5} />
      ) : rankings.length === 0 ? (
        <View style={styles.centered}>
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
  signOut: {
    color: COLORS.PRIMARY,
    fontSize: 14,
  },
  navButtons: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.MD,
    marginBottom: SPACING.MD,
    gap: SPACING.SM,
  },
  treasuryButton: {
    backgroundColor: COLORS.SUCCESS,
    marginHorizontal: SPACING.MD,
    marginBottom: SPACING.MD,
    padding: SPACING.MD,
    borderRadius: 12,
    alignItems: 'center',
  },
  treasuryButtonText: {
    ...TYPOGRAPHY.BODY,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: SPACING.MD,
    paddingBottom: SPACING.LG,
  },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  emptyText: {
    ...TYPOGRAPHY.H4,
  },
  emptySubtext: {
    ...TYPOGRAPHY.BODY_SMALL,
    textAlign: 'center',
  },
});

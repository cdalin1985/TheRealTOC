import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
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

export function StandingsScreen({ navigation }: Props) {
  const [rankings, setRankings] = useState<RankWithPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { profile, signOut } = useAuth();

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

  const renderRankItem = ({ item }: { item: RankWithPlayer }) => (
    <View style={styles.rankItem}>
      <View style={styles.rankPosition}>
        <Text style={styles.rankNumber}>#{item.rank_position}</Text>
      </View>
      <View style={styles.playerInfo}>
        <Text style={styles.playerName}>{item.display_name}</Text>
        <Text style={styles.points}>{item.points} pts</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>The List</Text>
        <TouchableOpacity onPress={handleSignOut}>
          <Text style={styles.signOut}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {profile && (
        <Text style={styles.welcome}>
          Welcome, {profile.display_name}
        </Text>
      )}

      <View style={styles.navButtons}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('CreateChallenge')}
        >
          <Text style={styles.navButtonText}>New Challenge</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navButton, styles.navButtonSecondary]}
          onPress={() => navigation.navigate('MyChallenges')}
        >
          <Text style={styles.navButtonText}>Challenges</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navButton, styles.navButtonSecondary]}
          onPress={() => navigation.navigate('MyMatches')}
        >
          <Text style={styles.navButtonText}>Matches</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.treasuryButton}
        onPress={() => navigation.navigate('Treasury')}
      >
        <Text style={styles.treasuryButtonText}>💰 View League Treasury</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#e94560" />
        </View>
      ) : rankings.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No rankings yet</Text>
          <Text style={styles.emptySubtext}>
            Be the first to join The List!
          </Text>
        </View>
      ) : (
        <FlatList
          data={rankings}
          keyExtractor={(item) => item.id}
          renderItem={renderRankItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#e94560"
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
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  signOut: {
    color: '#e94560',
    fontSize: 14,
  },
  welcome: {
    color: '#888',
    fontSize: 14,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  navButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  navButton: {
    flex: 1,
    backgroundColor: '#e94560',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  navButtonSecondary: {
    backgroundColor: '#16213e',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 16,
  },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  rankPosition: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e94560',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rankNumber: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  points: {
    color: '#888',
    fontSize: 14,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
  },
  treasuryButton: {
    backgroundColor: '#2ecc71',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  treasuryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

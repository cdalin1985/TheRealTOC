import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { usePlayer } from '../hooks/usePlayer';
import { useMatches } from '../hooks/useMatches';
import { DISCIPLINES, MATCH_STATUSES, type DisciplineId } from '../lib/constants';
import type { RootStackParamList } from '../types/navigation';
import type { MatchStatus } from '../types/database';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'MyMatches'>;
};

type FilterType = 'all' | 'scheduled' | 'completed' | 'disputed';

export function MyMatchesScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { player } = usePlayer(user?.id ?? null);
  const { matches, loading, refresh } = useMatches(player?.id ?? null);
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredMatches = matches.filter(match => {
    if (filter === 'all') return true;
    if (filter === 'scheduled') return match.status === 'scheduled';
    if (filter === 'completed') return match.status === 'completed';
    if (filter === 'disputed') return match.status === 'disputed';
    return true;
  });

  const getStatusColor = (status: MatchStatus) => {
    switch (status) {
      case 'scheduled':
        return '#3498db';
      case 'in_progress':
        return '#f1c40f';
      case 'completed':
        return '#2ecc71';
      case 'disputed':
        return '#e74c3c';
      case 'cancelled':
        return '#888';
      default:
        return '#888';
    }
  };

  const renderMatch = ({ item }: { item: typeof matches[0] }) => {
    const isChallenger = item.challenger_player_id === player?.id;
    const hasSubmitted = isChallenger
      ? item.challenger_submitted_at !== null
      : item.challenged_submitted_at !== null;

    return (
      <TouchableOpacity
        style={styles.matchCard}
        onPress={() => navigation.navigate('MatchDetail', { matchId: item.id })}
      >
        <View style={styles.matchHeader}>
          <View
            style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}
          >
            <Text style={styles.statusText}>
              {MATCH_STATUSES[item.status]}
            </Text>
          </View>
          <Text style={styles.discipline}>
            {DISCIPLINES[item.discipline_id as DisciplineId]}
          </Text>
        </View>

        <View style={styles.playersRow}>
          <View style={styles.playerCol}>
            <Text style={styles.playerName}>{item.challenger_display_name}</Text>
            <Text style={styles.playerRank}>#{item.challenger_rank ?? '?'}</Text>
            {item.status === 'completed' && (
              <Text style={styles.score}>{item.challenger_games}</Text>
            )}
          </View>
          <Text style={styles.vs}>vs</Text>
          <View style={styles.playerCol}>
            <Text style={styles.playerName}>{item.challenged_display_name}</Text>
            <Text style={styles.playerRank}>#{item.challenged_rank ?? '?'}</Text>
            {item.status === 'completed' && (
              <Text style={styles.score}>{item.challenged_games}</Text>
            )}
          </View>
        </View>

        <View style={styles.detailsRow}>
          <Text style={styles.venueText}>{item.venue_name}</Text>
          <Text style={styles.dateText}>
            {new Date(item.scheduled_at).toLocaleDateString()}
          </Text>
        </View>

        {item.status === 'scheduled' && (
          <View style={styles.submissionStatus}>
            <Text style={[styles.submissionText, hasSubmitted && styles.submitted]}>
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
      </TouchableOpacity>
    );
  };

  const renderFilter = (type: FilterType, label: string) => (
    <TouchableOpacity
      style={[styles.filterButton, filter === type && styles.filterButtonActive]}
      onPress={() => setFilter(type)}
    >
      <Text style={[styles.filterText, filter === type && styles.filterTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Matches</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.filters}>
        {renderFilter('all', 'All')}
        {renderFilter('scheduled', 'Scheduled')}
        {renderFilter('completed', 'Completed')}
        {renderFilter('disputed', 'Disputed')}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#e94560" />
        </View>
      ) : filteredMatches.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No matches found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredMatches}
          keyExtractor={(item) => item.id}
          renderItem={renderMatch}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refresh}
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
    paddingBottom: 20,
  },
  backButton: {
    color: '#e94560',
    fontSize: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#16213e',
    borderRadius: 16,
  },
  filterButtonActive: {
    backgroundColor: '#e94560',
  },
  filterText: {
    color: '#888',
    fontSize: 12,
  },
  filterTextActive: {
    color: '#fff',
  },
  list: {
    paddingHorizontal: 16,
  },
  matchCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  discipline: {
    color: '#888',
    fontSize: 14,
  },
  playersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  playerCol: {
    flex: 1,
    alignItems: 'center',
  },
  playerName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  playerRank: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  score: {
    color: '#e94560',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  vs: {
    color: '#666',
    fontSize: 14,
    marginHorizontal: 8,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#2a2a4e',
  },
  venueText: {
    color: '#888',
    fontSize: 12,
  },
  dateText: {
    color: '#666',
    fontSize: 12,
  },
  submissionStatus: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#2a2a4e',
  },
  submissionText: {
    color: '#f1c40f',
    fontSize: 12,
    textAlign: 'center',
  },
  submitted: {
    color: '#2ecc71',
  },
  winnerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#2a2a4e',
  },
  winnerLabel: {
    color: '#888',
    fontSize: 12,
    marginRight: 4,
  },
  winnerName: {
    color: '#2ecc71',
    fontSize: 12,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
  },
});

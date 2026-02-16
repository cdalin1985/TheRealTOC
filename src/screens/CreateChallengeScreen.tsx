import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { usePlayer } from '../hooks/usePlayer';
import { useChallenges } from '../hooks/useChallenges';
import { DISCIPLINES, MIN_RACE, MAX_RANK_DIFF, type DisciplineId } from '../lib/constants';
import type { RootStackParamList } from '../types/navigation';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CreateChallenge'>;
};

interface EligiblePlayer {
  player_id: string;
  display_name: string;
  rank_position: number;
}

export function CreateChallengeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { player, rank } = usePlayer(user?.id ?? null);
  const { createChallenge } = useChallenges(player?.id ?? null);

  const [eligiblePlayers, setEligiblePlayers] = useState<EligiblePlayer[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<EligiblePlayer | null>(null);
  const [selectedDiscipline, setSelectedDiscipline] = useState<DisciplineId>('8-ball');
  const [raceTo, setRaceTo] = useState(String(MIN_RACE));
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!player || !rank) {
      setLoading(false);
      return;
    }

    const fetchEligiblePlayers = async () => {
      const minRank = Math.max(1, rank.rank_position - MAX_RANK_DIFF);
      const maxRank = rank.rank_position + MAX_RANK_DIFF;

      const { data, error } = await supabase
        .from('ranks')
        .select(`
          player_id,
          rank_position,
          players!inner (
            id,
            profile_id,
            profiles!inner (display_name)
          )
        `)
        .gte('rank_position', minRank)
        .lte('rank_position', maxRank)
        .neq('player_id', player.id)
        .order('rank_position', { ascending: true });

      if (error) {
        console.error('Error fetching eligible players:', error);
        setLoading(false);
        return;
      }

      const players: EligiblePlayer[] = (data || []).map((r: any) => ({
        player_id: r.player_id,
        display_name: r.players?.profiles?.display_name || 'Unknown',
        rank_position: r.rank_position,
      }));

      setEligiblePlayers(players);
      setLoading(false);
    };

    fetchEligiblePlayers();
  }, [player, rank]);

  const handleSubmit = async () => {
    if (!selectedPlayer) {
      Alert.alert('Error', 'Please select an opponent');
      return;
    }

    const raceToNum = parseInt(raceTo, 10);
    if (isNaN(raceToNum) || raceToNum < MIN_RACE) {
      Alert.alert('Error', `Race must be at least ${MIN_RACE}`);
      return;
    }

    setSubmitting(true);
    const result = await createChallenge(
      selectedPlayer.player_id,
      selectedDiscipline,
      raceToNum
    );
    setSubmitting(false);

    if (result.success) {
      Alert.alert('Success', 'Challenge sent!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } else {
      Alert.alert('Error', result.error || 'Failed to create challenge');
    }
  };

  if (!rank) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>New Challenge</Text>
          <View style={{ width: 50 }} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>You must be ranked to create challenges</Text>
        </View>
      </View>
    );
  }

  const renderPlayerItem = ({ item }: { item: EligiblePlayer }) => {
    const isSelected = selectedPlayer?.player_id === item.player_id;
    return (
      <TouchableOpacity
        style={[styles.playerItem, isSelected && styles.playerItemSelected]}
        onPress={() => setSelectedPlayer(item)}
      >
        <View style={styles.playerRank}>
          <Text style={styles.playerRankText}>#{item.rank_position}</Text>
        </View>
        <Text style={styles.playerName}>{item.display_name}</Text>
        {isSelected && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>New Challenge</Text>
        <View style={{ width: 50 }} />
      </View>

      <Text style={styles.sectionTitle}>Your Rank: #{rank.rank_position}</Text>
      <Text style={styles.hint}>
        You can challenge players within ±{MAX_RANK_DIFF} ranks
      </Text>

      <Text style={styles.sectionTitle}>Select Opponent</Text>
      {loading ? (
        <ActivityIndicator color="#e94560" style={{ marginVertical: 20 }} />
      ) : eligiblePlayers.length === 0 ? (
        <Text style={styles.emptyText}>No eligible opponents found</Text>
      ) : (
        <FlatList
          data={eligiblePlayers}
          keyExtractor={(item) => item.player_id}
          renderItem={renderPlayerItem}
          style={styles.playerList}
        />
      )}

      <Text style={styles.sectionTitle}>Discipline</Text>
      <View style={styles.disciplineRow}>
        {(Object.keys(DISCIPLINES) as DisciplineId[]).map((d) => (
          <TouchableOpacity
            key={d}
            style={[
              styles.disciplineButton,
              selectedDiscipline === d && styles.disciplineButtonSelected,
            ]}
            onPress={() => setSelectedDiscipline(d)}
          >
            <Text
              style={[
                styles.disciplineText,
                selectedDiscipline === d && styles.disciplineTextSelected,
              ]}
            >
              {DISCIPLINES[d]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Race To</Text>
      <TextInput
        style={styles.raceInput}
        value={raceTo}
        onChangeText={setRaceTo}
        keyboardType="number-pad"
        placeholder={`Minimum ${MIN_RACE}`}
        placeholderTextColor="#666"
      />

      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Send Challenge</Text>
        )}
      </TouchableOpacity>
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
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  hint: {
    color: '#666',
    fontSize: 12,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  playerList: {
    maxHeight: 200,
    marginHorizontal: 16,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  playerItemSelected: {
    backgroundColor: '#e94560',
  },
  playerRank: {
    width: 40,
    marginRight: 12,
  },
  playerRankText: {
    color: '#888',
    fontSize: 14,
  },
  playerName: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  checkmark: {
    color: '#fff',
    fontSize: 18,
  },
  disciplineRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  disciplineButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#16213e',
    borderRadius: 8,
    alignItems: 'center',
  },
  disciplineButtonSelected: {
    backgroundColor: '#e94560',
  },
  disciplineText: {
    color: '#888',
    fontSize: 14,
  },
  disciplineTextSelected: {
    color: '#fff',
  },
  raceInput: {
    backgroundColor: '#16213e',
    marginHorizontal: 16,
    borderRadius: 8,
    padding: 16,
    color: '#fff',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#e94560',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 40,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

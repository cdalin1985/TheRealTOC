import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { usePlayer } from '../hooks/usePlayer';
import { useMatches } from '../hooks/useMatches';
import { validateMatchScore } from '../lib/match';
import { DISCIPLINES, MATCH_STATUSES, type DisciplineId } from '../lib/constants';
import type { RootStackParamList } from '../types/navigation';
import type { Match, MatchStatus } from '../types/database';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'MatchDetail'>;
  route: RouteProp<RootStackParamList, 'MatchDetail'>;
};

interface MatchWithDetails extends Match {
  challenger_display_name: string;
  challenged_display_name: string;
  venue_name: string;
}

export function MatchDetailScreen({ navigation, route }: Props) {
  const { matchId } = route.params;
  const { user } = useAuth();
  const { player } = usePlayer(user?.id ?? null);
  const { submitMatchResult } = useMatches(player?.id ?? null);

  const [match, setMatch] = useState<MatchWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [myGames, setMyGames] = useState('');
  const [opponentGames, setOpponentGames] = useState('');
  const [livestreamUrl, setLivestreamUrl] = useState('');

  useEffect(() => {
    fetchMatch();
  }, [matchId]);

  const fetchMatch = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('matches')
      .select(`
        *,
        challenger:players!matches_challenger_player_id_fkey (
          profile:profiles!players_profile_id_fkey (display_name)
        ),
        challenged:players!matches_challenged_player_id_fkey (
          profile:profiles!players_profile_id_fkey (display_name)
        ),
        venue:venues (name)
      `)
      .eq('id', matchId)
      .single();

    if (error || !data) {
      Alert.alert('Error', 'Match not found');
      navigation.goBack();
      return;
    }

    setMatch({
      ...data,
      challenger_display_name: (data.challenger as any)?.profile?.display_name || 'Unknown',
      challenged_display_name: (data.challenged as any)?.profile?.display_name || 'Unknown',
      venue_name: (data.venue as any)?.name || 'Unknown',
    } as MatchWithDetails);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!match || !player) return;

    const myGamesNum = parseInt(myGames, 10);
    const oppGamesNum = parseInt(opponentGames, 10);

    if (isNaN(myGamesNum) || isNaN(oppGamesNum)) {
      Alert.alert('Error', 'Please enter valid numbers for both scores');
      return;
    }

    // Determine canonical challenger/challenged games based on who is submitting
    const isChallenger = match.challenger_player_id === player.id;
    const challengerGames = isChallenger ? myGamesNum : oppGamesNum;
    const challengedGames = isChallenger ? oppGamesNum : myGamesNum;

    // Validate score
    const validation = validateMatchScore(challengerGames, challengedGames, match.race_to);
    if (!validation.valid) {
      Alert.alert('Invalid Score', validation.error || 'Invalid score');
      return;
    }

    setSubmitting(true);
    const result = await submitMatchResult(
      matchId,
      myGamesNum,
      oppGamesNum,
      livestreamUrl || undefined
    );
    setSubmitting(false);

    if (result.success) {
      if (result.status === 'completed') {
        Alert.alert('Match Completed', 'Both scores matched. Rankings have been updated!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else if (result.status === 'disputed') {
        Alert.alert('Score Mismatch', 'The scores do not match. Match is now disputed.', [
          { text: 'OK', onPress: () => fetchMatch() },
        ]);
      } else {
        Alert.alert('Submitted', 'Your score has been recorded. Waiting for opponent.', [
          { text: 'OK', onPress: () => fetchMatch() },
        ]);
      }
    } else {
      Alert.alert('Error', result.error || 'Failed to submit score');
    }
  };

  const getStatusColor = (status: MatchStatus) => {
    switch (status) {
      case 'scheduled':
        return '#3498db';
      case 'completed':
        return '#2ecc71';
      case 'disputed':
        return '#e74c3c';
      default:
        return '#888';
    }
  };

  if (loading || !match) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#e94560" />
        </View>
      </View>
    );
  }

  const isChallenger = match.challenger_player_id === player?.id;
  const isChallenged = match.challenged_player_id === player?.id;
  const hasSubmitted = isChallenger
    ? match.challenger_submitted_at !== null
    : match.challenged_submitted_at !== null;
  const opponentSubmitted = isChallenger
    ? match.challenged_submitted_at !== null
    : match.challenger_submitted_at !== null;
  const canSubmit = match.status === 'scheduled' && !hasSubmitted;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Match Details</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.card}>
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(match.status) }]}>
            <Text style={styles.statusText}>{MATCH_STATUSES[match.status]}</Text>
          </View>
          <Text style={styles.discipline}>
            {DISCIPLINES[match.discipline_id as DisciplineId]}
          </Text>
        </View>

        <View style={styles.playersSection}>
          <View style={styles.playerCol}>
            <Text style={styles.playerLabel}>Challenger</Text>
            <Text style={styles.playerName}>{match.challenger_display_name}</Text>
            {match.status === 'completed' && (
              <Text style={styles.finalScore}>{match.challenger_games}</Text>
            )}
          </View>
          <Text style={styles.vsLarge}>VS</Text>
          <View style={styles.playerCol}>
            <Text style={styles.playerLabel}>Challenged</Text>
            <Text style={styles.playerName}>{match.challenged_display_name}</Text>
            {match.status === 'completed' && (
              <Text style={styles.finalScore}>{match.challenged_games}</Text>
            )}
          </View>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Race To</Text>
            <Text style={styles.infoValue}>{match.race_to}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Venue</Text>
            <Text style={styles.infoValue}>{match.venue_name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Scheduled</Text>
            <Text style={styles.infoValue}>
              {new Date(match.scheduled_at).toLocaleString()}
            </Text>
          </View>
          {match.livestream_url && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Livestream</Text>
              <Text style={[styles.infoValue, styles.link]}>{match.livestream_url}</Text>
            </View>
          )}
        </View>

        {match.status === 'disputed' && (
          <View style={styles.disputedSection}>
            <Text style={styles.disputedTitle}>Match Disputed</Text>
            <Text style={styles.disputedText}>
              The submitted scores do not match. Please contact an admin to resolve.
            </Text>
          </View>
        )}
      </View>

      {match.status === 'scheduled' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Submit Score</Text>

          <View style={styles.submissionStatusRow}>
            <View style={styles.submissionCol}>
              <Text style={styles.submissionLabel}>You</Text>
              <Text style={[styles.submissionStatus, hasSubmitted && styles.submitted]}>
                {hasSubmitted ? '✓ Submitted' : 'Not submitted'}
              </Text>
            </View>
            <View style={styles.submissionCol}>
              <Text style={styles.submissionLabel}>Opponent</Text>
              <Text style={[styles.submissionStatus, opponentSubmitted && styles.submitted]}>
                {opponentSubmitted ? '✓ Submitted' : 'Not submitted'}
              </Text>
            </View>
          </View>

          {canSubmit ? (
            <>
              <Text style={styles.inputLabel}>Your Games Won</Text>
              <TextInput
                style={styles.input}
                value={myGames}
                onChangeText={setMyGames}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor="#666"
              />

              <Text style={styles.inputLabel}>Opponent Games Won</Text>
              <TextInput
                style={styles.input}
                value={opponentGames}
                onChangeText={setOpponentGames}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor="#666"
              />

              <Text style={styles.inputLabel}>Livestream URL (optional)</Text>
              <TextInput
                style={styles.input}
                value={livestreamUrl}
                onChangeText={setLivestreamUrl}
                placeholder="https://..."
                placeholderTextColor="#666"
                autoCapitalize="none"
              />

              <Text style={styles.hint}>
                Race to {match.race_to}. Winner must have exactly {match.race_to} games.
              </Text>

              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Score</Text>
                )}
              </TouchableOpacity>
            </>
          ) : hasSubmitted ? (
            <Text style={styles.waitingText}>
              Waiting for opponent to submit their score...
            </Text>
          ) : null}
        </View>
      )}
    </ScrollView>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  discipline: {
    color: '#888',
    fontSize: 16,
  },
  playersSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  playerCol: {
    flex: 1,
    alignItems: 'center',
  },
  playerLabel: {
    color: '#666',
    fontSize: 12,
    marginBottom: 4,
  },
  playerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  finalScore: {
    color: '#e94560',
    fontSize: 36,
    fontWeight: 'bold',
    marginTop: 8,
  },
  vsLarge: {
    color: '#666',
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 16,
  },
  infoSection: {
    borderTopWidth: 1,
    borderTopColor: '#2a2a4e',
    paddingTop: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    color: '#888',
    fontSize: 14,
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
  },
  link: {
    color: '#3498db',
  },
  disputedSection: {
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  disputedTitle: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  disputedText: {
    color: '#e74c3c',
    fontSize: 14,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  submissionStatusRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  submissionCol: {
    flex: 1,
    alignItems: 'center',
  },
  submissionLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  submissionStatus: {
    color: '#f1c40f',
    fontSize: 14,
  },
  submitted: {
    color: '#2ecc71',
  },
  inputLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    color: '#fff',
    fontSize: 16,
  },
  hint: {
    color: '#666',
    fontSize: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#e94560',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  waitingText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

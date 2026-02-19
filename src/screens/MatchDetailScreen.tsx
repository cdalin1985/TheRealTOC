import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { usePlayer } from '../hooks/usePlayer';
import { useMatches } from '../hooks/useMatches';
import { validateMatchScore } from '../lib/match';
import { Header } from '../components/Header';
import { AnimatedButton } from '../components/AnimatedButton';
import { AnimatedInput } from '../components/AnimatedInput';
import { AnimatedCard } from '../components/AnimatedCard';
import { InlineFeedback } from '../components/FeedbackToast';
import { COLORS, TYPOGRAPHY, SPACING, ANIMATION } from '../lib/animations';
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

function StatusBadge({ status }: { status: MatchStatus }) {
  const getStatusColor = (s: MatchStatus) => {
    switch (s) {
      case 'scheduled':
        return COLORS.INFO;
      case 'completed':
        return COLORS.SUCCESS;
      case 'disputed':
        return COLORS.ERROR;
      default:
        return COLORS.TEXT_TERTIARY;
    }
  };

  const getStatusIcon = (s: MatchStatus): keyof typeof Ionicons.glyphMap => {
    switch (s) {
      case 'scheduled':
        return 'calendar-outline';
      case 'completed':
        return 'checkmark-circle-outline';
      case 'disputed':
        return 'alert-circle-outline';
      default:
        return 'help-circle-outline';
    }
  };

  return (
    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
      <Ionicons
        name={getStatusIcon(status)}
        size={14}
        color={COLORS.TEXT_PRIMARY}
        style={styles.statusIcon}
      />
      <Text style={styles.statusText}>{MATCH_STATUSES[status]}</Text>
    </View>
  );
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
  const [error, setError] = useState<string | null>(null);

  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    fetchMatch();
  }, [matchId]);

  useEffect(() => {
    if (!loading && match) {
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: ANIMATION.DURATION.SLOW,
          easing: ANIMATION.EASING.STANDARD,
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslateY, {
          toValue: 0,
          duration: ANIMATION.DURATION.ENTRANCE,
          easing: ANIMATION.EASING.ENTER,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading, match]);

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
      setError('Please enter valid numbers for both scores');
      return;
    }

    const isChallenger = match.challenger_player_id === player.id;
    const challengerGames = isChallenger ? myGamesNum : oppGamesNum;
    const challengedGames = isChallenger ? oppGamesNum : myGamesNum;

    const validation = validateMatchScore(challengerGames, challengedGames, match.race_to);
    if (!validation.valid) {
      setError(validation.error || 'Invalid score');
      return;
    }

    setError(null);
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
      setError(result.error || 'Failed to submit score');
    }
  };

  if (loading || !match) {
    return (
      <View style={styles.container}>
        <Header title="Match Details" onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <Animated.View
            style={{
              transform: [
                {
                  rotate: contentOpacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            }}
          >
            <Ionicons name="refresh" size={32} color={COLORS.PRIMARY} />
          </Animated.View>
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <Header title="Match Details" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: contentOpacity,
              transform: [{ translateY: contentTranslateY }],
            },
          ]}
        >
          {/* Match Info Card */}
          <AnimatedCard style={styles.card}>
            <View style={styles.statusRow}>
              <StatusBadge status={match.status} />
              <Text style={styles.discipline}>
                {DISCIPLINES[match.discipline_id as DisciplineId]}
              </Text>
            </View>

            <View style={styles.playersSection}>
              <View style={styles.playerCol}>
                <Text style={styles.playerLabel}>Challenger</Text>
                <Text style={styles.playerName} numberOfLines={1}>
                  {match.challenger_display_name}
                </Text>
                {match.status === 'completed' && (
                  <Text style={styles.finalScore}>{match.challenger_games}</Text>
                )}
              </View>
              <Text style={styles.vsLarge}>VS</Text>
              <View style={styles.playerCol}>
                <Text style={styles.playerLabel}>Challenged</Text>
                <Text style={styles.playerName} numberOfLines={1}>
                  {match.challenged_display_name}
                </Text>
                {match.status === 'completed' && (
                  <Text style={styles.finalScore}>{match.challenged_games}</Text>
                )}
              </View>
            </View>

            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Ionicons name="flag-outline" size={16} color={COLORS.TEXT_TERTIARY} />
                  <Text style={styles.infoLabel}>Race To</Text>
                </View>
                <Text style={styles.infoValue}>{match.race_to}</Text>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Ionicons name="location-outline" size={16} color={COLORS.TEXT_TERTIARY} />
                  <Text style={styles.infoLabel}>Venue</Text>
                </View>
                <Text style={styles.infoValue} numberOfLines={1}>{match.venue_name}</Text>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Ionicons name="calendar-outline" size={16} color={COLORS.TEXT_TERTIARY} />
                  <Text style={styles.infoLabel}>Scheduled</Text>
                </View>
                <Text style={styles.infoValue}>
                  {new Date(match.scheduled_at).toLocaleString()}
                </Text>
              </View>

              {match.livestream_url && (
                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <Ionicons name="videocam-outline" size={16} color={COLORS.TEXT_TERTIARY} />
                    <Text style={styles.infoLabel}>Livestream</Text>
                  </View>
                  <Text style={[styles.infoValue, styles.link]} numberOfLines={1}>
                    {match.livestream_url}
                  </Text>
                </View>
              )}
            </View>

            {match.status === 'disputed' && (
              <View style={styles.disputedSection}>
                <Ionicons name="warning" size={20} color={COLORS.ERROR} />
                <View style={styles.disputedContent}>
                  <Text style={styles.disputedTitle}>Match Disputed</Text>
                  <Text style={styles.disputedText}>
                    The submitted scores do not match. Please contact an admin to resolve.
                  </Text>
                </View>
              </View>
            )}
          </AnimatedCard>

          {/* Score Submission Card */}
          {match.status === 'scheduled' && (
            <AnimatedCard style={styles.card}>
              <Text style={styles.sectionTitle}>Submit Score</Text>

              <View style={styles.submissionStatusRow}>
                <View style={styles.submissionCol}>
                  <View style={styles.submissionIcon}>
                    <Ionicons
                      name={hasSubmitted ? 'checkmark-circle' : 'person-outline'}
                      size={24}
                      color={hasSubmitted ? COLORS.SUCCESS : COLORS.TEXT_TERTIARY}
                    />
                  </View>
                  <Text style={styles.submissionLabel}>You</Text>
                  <Text
                    style={[
                      styles.submissionStatus,
                      hasSubmitted && styles.submitted,
                    ]}
                  >
                    {hasSubmitted ? 'Submitted' : 'Pending'}
                  </Text>
                </View>

                <View style={styles.submissionDivider} />

                <View style={styles.submissionCol}>
                  <View style={styles.submissionIcon}>
                    <Ionicons
                      name={opponentSubmitted ? 'checkmark-circle' : 'person-outline'}
                      size={24}
                      color={opponentSubmitted ? COLORS.SUCCESS : COLORS.TEXT_TERTIARY}
                    />
                  </View>
                  <Text style={styles.submissionLabel}>Opponent</Text>
                  <Text
                    style={[
                      styles.submissionStatus,
                      opponentSubmitted && styles.submitted,
                    ]}
                  >
                    {opponentSubmitted ? 'Submitted' : 'Pending'}
                  </Text>
                </View>
              </View>

              {error && (
                <InlineFeedback type="error" message={error} style={styles.errorContainer} />
              )}

              {canSubmit ? (
                <View style={styles.submitForm}>
                  <View style={styles.scoreInputs}>
                    <View style={styles.scoreInput}>
                      <Text style={styles.inputLabel}>Your Games</Text>
                      <TextInput
                        style={styles.scoreInputField}
                        value={myGames}
                        onChangeText={setMyGames}
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor={COLORS.TEXT_TERTIARY}
                        maxLength={2}
                      />
                    </View>

                    <Text style={styles.scoreDivider}>-</Text>

                    <View style={styles.scoreInput}>
                      <Text style={styles.inputLabel}>Opponent</Text>
                      <TextInput
                        style={styles.scoreInputField}
                        value={opponentGames}
                        onChangeText={setOpponentGames}
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor={COLORS.TEXT_TERTIARY}
                        maxLength={2}
                      />
                    </View>
                  </View>

                  <AnimatedInput
                    label="Livestream URL (optional)"
                    placeholder="https://..."
                    value={livestreamUrl}
                    onChangeText={setLivestreamUrl}
                    autoCapitalize="none"
                    icon="videocam-outline"
                    containerStyle={styles.livestreamInput}
                  />

                  <View style={styles.hintBox}>
                    <Ionicons name="information-circle-outline" size={16} color={COLORS.INFO} />
                    <Text style={styles.hint}>
                      Race to {match.race_to}. Winner must have exactly {match.race_to} games.
                    </Text>
                  </View>

                  <AnimatedButton
                    onPress={handleSubmit}
                    loading={submitting}
                    disabled={submitting}
                    size="large"
                  >
                    Submit Score
                  </AnimatedButton>
                </View>
              ) : hasSubmitted ? (
                <View style={styles.waitingBox}>
                  <Ionicons name="time-outline" size={32} color={COLORS.WARNING} />
                  <Text style={styles.waitingText}>
                    Waiting for opponent to submit their score...
                  </Text>
                </View>
              ) : null}
            </AnimatedCard>
          )}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  scrollContent: {
    padding: SPACING.MD,
    paddingBottom: SPACING.XL,
  },
  content: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginBottom: SPACING.MD,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.LG,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusIcon: {
    marginRight: 6,
  },
  statusText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '600',
  },
  discipline: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 16,
  },
  playersSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.LG,
  },
  playerCol: {
    flex: 1,
    alignItems: 'center',
  },
  playerLabel: {
    color: COLORS.TEXT_TERTIARY,
    fontSize: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  playerName: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  finalScore: {
    color: COLORS.PRIMARY,
    fontSize: 36,
    fontWeight: 'bold',
    marginTop: SPACING.SM,
  },
  vsLarge: {
    color: COLORS.TEXT_TERTIARY,
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: SPACING.MD,
  },
  infoSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
    paddingTop: SPACING.MD,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoLabel: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 14,
  },
  infoValue: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '500',
    maxWidth: 200,
  },
  link: {
    color: COLORS.INFO,
  },
  disputedSection: {
    flexDirection: 'row',
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderRadius: 12,
    padding: SPACING.MD,
    marginTop: SPACING.MD,
    gap: SPACING.MD,
  },
  disputedContent: {
    flex: 1,
  },
  disputedTitle: {
    color: COLORS.ERROR,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  disputedText: {
    color: COLORS.ERROR,
    fontSize: 14,
    opacity: 0.9,
  },
  sectionTitle: {
    ...TYPOGRAPHY.H4,
    marginBottom: SPACING.MD,
  },
  submissionStatusRow: {
    flexDirection: 'row',
    marginBottom: SPACING.LG,
  },
  submissionCol: {
    flex: 1,
    alignItems: 'center',
  },
  submissionIcon: {
    marginBottom: SPACING.XS,
  },
  submissionLabel: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 12,
    marginBottom: 4,
  },
  submissionStatus: {
    color: COLORS.WARNING,
    fontSize: 14,
    fontWeight: '600',
  },
  submitted: {
    color: COLORS.SUCCESS,
  },
  submissionDivider: {
    width: 1,
    backgroundColor: COLORS.BORDER,
    marginHorizontal: SPACING.MD,
  },
  errorContainer: {
    marginBottom: SPACING.MD,
  },
  submitForm: {
    marginTop: SPACING.MD,
  },
  scoreInputs: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: SPACING.MD,
  },
  scoreInput: {
    alignItems: 'center',
  },
  inputLabel: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 12,
    marginBottom: SPACING.XS,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scoreInputField: {
    width: 80,
    height: 56,
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 12,
    color: COLORS.TEXT_PRIMARY,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  scoreDivider: {
    color: COLORS.TEXT_TERTIARY,
    fontSize: 24,
    fontWeight: 'bold',
    marginHorizontal: SPACING.LG,
    marginBottom: SPACING.SM,
  },
  livestreamInput: {
    marginBottom: SPACING.MD,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    borderRadius: 8,
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
    gap: SPACING.SM,
  },
  hint: {
    color: COLORS.INFO,
    fontSize: 12,
    flex: 1,
  },
  waitingBox: {
    alignItems: 'center',
    padding: SPACING.LG,
  },
  waitingText: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 14,
    textAlign: 'center',
    marginTop: SPACING.MD,
  },
});

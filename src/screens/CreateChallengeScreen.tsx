import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  TextInput,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { usePlayer } from '../hooks/usePlayer';
import { useChallenges } from '../hooks/useChallenges';
import { Header } from '../components/Header';
import { AnimatedButton } from '../components/AnimatedButton';
import { AnimatedCard } from '../components/AnimatedCard';
import { InlineFeedback } from '../components/FeedbackToast';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { COLORS, TYPOGRAPHY, SPACING, ANIMATION } from '../lib/animations';
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

function DisciplineButton({
  discipline,
  isSelected,
  onPress,
}: {
  discipline: DisciplineId;
  isSelected: boolean;
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

  const getDisciplineIcon = (d: DisciplineId): keyof typeof Ionicons.glyphMap => {
    switch (d) {
      case '8-ball':
        return 'ellipse-outline';
      case '9-ball':
        return 'disc-outline';
      case '10-ball':
        return 'tennisball-outline';
      case 'straight-pool':
        return 'infinite-outline';
      case 'one-pocket':
        return 'square-outline';
      default:
        return 'help-circle-outline';
    }
  };

  return (
    <Animated.View style={{ transform: [{ scale }], flex: 1 }}>
      <TouchableOpacity
        style={[
          styles.disciplineButton,
          isSelected && styles.disciplineButtonSelected,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <Ionicons
          name={getDisciplineIcon(discipline)}
          size={20}
          color={isSelected ? COLORS.TEXT_PRIMARY : COLORS.TEXT_SECONDARY}
        />
        <Text
          style={[
            styles.disciplineText,
            isSelected && styles.disciplineTextSelected,
          ]}
          numberOfLines={1}
        >
          {DISCIPLINES[discipline]}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function PlayerItem({
  item,
  isSelected,
  onPress,
  index,
}: {
  item: EligiblePlayer;
  isSelected: boolean;
  onPress: () => void;
  index: number;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <AnimatedCard
        index={index}
        style={[
          styles.playerItem,
          isSelected && styles.playerItemSelected,
        ]}
      >
        <View style={styles.playerRank}>
          <Text style={styles.playerRankText}>#{item.rank_position}</Text>
        </View>
        <Text style={styles.playerName} numberOfLines={1}>
          {item.display_name}
        </Text>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color={COLORS.SUCCESS} />
        )}
      </AnimatedCard>
    </TouchableOpacity>
  );
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
  const [error, setError] = useState<string | null>(null);

  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (!loading) {
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
  }, [loading]);

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

  const handleSubmit = useCallback(async () => {
    if (!selectedPlayer) {
      setError('Please select an opponent');
      return;
    }

    const raceToNum = parseInt(raceTo, 10);
    if (isNaN(raceToNum) || raceToNum < MIN_RACE) {
      setError(`Race must be at least ${MIN_RACE}`);
      return;
    }

    setError(null);
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
      setError(result.error || 'Failed to create challenge');
    }
  }, [selectedPlayer, selectedDiscipline, raceTo, createChallenge, navigation]);

  if (!rank) {
    return (
      <View style={styles.container}>
        <Header title="New Challenge" onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <Ionicons name="trophy-outline" size={48} color={COLORS.TEXT_TERTIARY} />
          <Text style={styles.emptyText}>You must be ranked to create challenges</Text>
        </View>
      </View>
    );
  }

  const renderPlayerItem = ({ item, index }: { item: EligiblePlayer; index: number }) => {
    const isSelected = selectedPlayer?.player_id === item.player_id;
    return (
      <PlayerItem
        item={item}
        isSelected={isSelected}
        onPress={() => {
          setSelectedPlayer(item);
          setError(null);
        }}
        index={index}
      />
    );
  };

  return (
    <View style={styles.container}>
      <Header title="New Challenge" onBack={() => navigation.goBack()} />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: contentOpacity,
            transform: [{ translateY: contentTranslateY }],
          },
        ]}
      >
        {/* Rank Info */}
        <View style={styles.rankInfo}>
          <View style={styles.rankBadge}>
            <Ionicons name="trophy" size={20} color={COLORS.PRIMARY} />
            <Text style={styles.rankText}>Your Rank: #{rank.rank_position}</Text>
          </View>
          <Text style={styles.hint}>
            You can challenge players within ±{MAX_RANK_DIFF} ranks
          </Text>
        </View>

        {error && (
          <InlineFeedback type="error" message={error} style={styles.errorContainer} />
        )}

        {/* Player Selection */}
        <Text style={styles.sectionTitle}>Select Opponent</Text>

        {loading ? (
          <LoadingSkeleton count={3} />
        ) : eligiblePlayers.length === 0 ? (
          <View style={styles.emptyPlayers}>
            <Ionicons name="people-outline" size={32} color={COLORS.TEXT_TERTIARY} />
            <Text style={styles.emptyText}>No eligible opponents found</Text>
          </View>
        ) : (
          <FlatList
            data={eligiblePlayers}
            keyExtractor={(item) => item.player_id}
            renderItem={renderPlayerItem}
            style={styles.playerList}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Discipline Selection */}
        <Text style={styles.sectionTitle}>Select Discipline</Text>
        <View style={styles.disciplineRow}>
          {(Object.keys(DISCIPLINES) as DisciplineId[]).map((d) => (
            <DisciplineButton
              key={d}
              discipline={d}
              isSelected={selectedDiscipline === d}
              onPress={() => setSelectedDiscipline(d)}
            />
          ))}
        </View>

        {/* Race Selection */}
        <Text style={styles.sectionTitle}>Race To</Text>
        <View style={styles.raceContainer}>
          <TouchableOpacity
            style={styles.raceButton}
            onPress={() => {
              const current = parseInt(raceTo, 10) || MIN_RACE;
              if (current > MIN_RACE) {
                setRaceTo(String(current - 1));
              }
            }}
          >
            <Ionicons name="remove" size={20} color={COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>

          <TextInput
            style={styles.raceInput}
            value={raceTo}
            onChangeText={setRaceTo}
            keyboardType="number-pad"
            placeholder={`Min ${MIN_RACE}`}
            placeholderTextColor={COLORS.TEXT_TERTIARY}
            maxLength={2}
          />

          <TouchableOpacity
            style={styles.raceButton}
            onPress={() => {
              const current = parseInt(raceTo, 10) || MIN_RACE;
              setRaceTo(String(current + 1));
            }}
          >
            <Ionicons name="add" size={20} color={COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
        </View>

        <Text style={styles.raceHint}>Minimum race: {MIN_RACE} games</Text>

        {/* Submit Button */}
        <AnimatedButton
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting || !selectedPlayer}
          size="large"
          style={styles.submitButton}
        >
          Send Challenge
        </AnimatedButton>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.MD,
  },
  rankInfo: {
    marginBottom: SPACING.MD,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE,
    padding: SPACING.MD,
    borderRadius: 12,
    gap: SPACING.SM,
    marginBottom: SPACING.XS,
  },
  rankText: {
    ...TYPOGRAPHY.BODY,
    fontWeight: '600',
  },
  hint: {
    ...TYPOGRAPHY.CAPTION,
    textAlign: 'center',
  },
  errorContainer: {
    marginBottom: SPACING.MD,
  },
  sectionTitle: {
    ...TYPOGRAPHY.H4,
    marginTop: SPACING.MD,
    marginBottom: SPACING.SM,
  },
  emptyPlayers: {
    alignItems: 'center',
    padding: SPACING.XL,
  },
  playerList: {
    maxHeight: 200,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.MD,
  },
  playerItemSelected: {
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
  },
  playerRank: {
    width: 40,
    marginRight: SPACING.MD,
  },
  playerRankText: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 14,
  },
  playerName: {
    flex: 1,
    color: COLORS.TEXT_PRIMARY,
    fontSize: 16,
  },
  disciplineRow: {
    flexDirection: 'row',
    gap: SPACING.SM,
    marginBottom: SPACING.MD,
  },
  disciplineButton: {
    flex: 1,
    paddingVertical: SPACING.MD,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
  disciplineButtonSelected: {
    backgroundColor: COLORS.PRIMARY,
  },
  disciplineText: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '500',
  },
  disciplineTextSelected: {
    color: COLORS.TEXT_PRIMARY,
  },
  raceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.MD,
    marginBottom: SPACING.XS,
  },
  raceButton: {
    width: 44,
    height: 44,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  raceInput: {
    width: 80,
    height: 56,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    color: COLORS.TEXT_PRIMARY,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  raceHint: {
    ...TYPOGRAPHY.CAPTION,
    textAlign: 'center',
    marginBottom: SPACING.LG,
  },
  submitButton: {
    marginBottom: SPACING.XL,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.LG,
  },
  emptyText: {
    ...TYPOGRAPHY.BODY_SMALL,
    marginTop: SPACING.MD,
    textAlign: 'center',
  },
});

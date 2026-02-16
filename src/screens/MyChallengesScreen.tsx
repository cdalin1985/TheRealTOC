import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { usePlayer } from '../hooks/usePlayer';
import { useChallenges } from '../hooks/useChallenges';
import { useVenues } from '../hooks/useVenues';
import { DISCIPLINES, CHALLENGE_STATUSES, type DisciplineId } from '../lib/constants';
import type { RootStackParamList } from '../types/navigation';
import type { ChallengeStatus, Venue } from '../types/database';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'MyChallenges'>;
};

interface ChallengeWithDetails {
  id: string;
  challenger_player_id: string;
  challenged_player_id: string;
  discipline_id: string;
  race_to: number;
  status: ChallengeStatus;
  venue_id: string | null;
  scheduled_at: string | null;
  proposed_by_player_id: string | null;
  locked_at: string | null;
  created_at: string;
  challenger_display_name: string;
  challenged_display_name: string;
  challenger_rank: number | null;
  challenged_rank: number | null;
  venue_name: string | null;
}

export function MyChallengesScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { player } = usePlayer(user?.id ?? null);
  const {
    challenges,
    loading,
    refresh,
    cancelChallenge,
    declineChallenge,
    proposeChallengeDetails,
    confirmChallenge,
  } = useChallenges(player?.id ?? null);
  const { venues } = useVenues();

  const [proposeModalVisible, setProposeModalVisible] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeWithDetails | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [submitting, setSubmitting] = useState(false);

  const handleCancel = useCallback(
    async (challengeId: string) => {
      Alert.alert(
        'Cancel Challenge',
        'Are you sure you want to cancel this challenge?',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes',
            style: 'destructive',
            onPress: async () => {
              const result = await cancelChallenge(challengeId);
              if (!result.success) {
                Alert.alert('Error', result.error || 'Failed to cancel challenge');
              }
            },
          },
        ]
      );
    },
    [cancelChallenge]
  );

  const handleDecline = useCallback(
    async (challengeId: string) => {
      Alert.alert(
        'Decline Challenge',
        'Are you sure you want to decline this challenge?',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes',
            style: 'destructive',
            onPress: async () => {
              const result = await declineChallenge(challengeId);
              if (!result.success) {
                Alert.alert('Error', result.error || 'Failed to decline challenge');
              }
            },
          },
        ]
      );
    },
    [declineChallenge]
  );

  const openProposeModal = (challenge: ChallengeWithDetails) => {
    setSelectedChallenge(challenge);
    setSelectedVenue(null);
    setSelectedDate(new Date(Date.now() + 24 * 60 * 60 * 1000)); // Default to tomorrow
    setProposeModalVisible(true);
  };

  const handlePropose = async () => {
    if (!selectedChallenge || !selectedVenue) {
      Alert.alert('Error', 'Please select a venue');
      return;
    }

    setSubmitting(true);
    const result = await proposeChallengeDetails(
      selectedChallenge.id,
      selectedVenue.id,
      selectedDate.toISOString()
    );
    setSubmitting(false);

    if (result.success) {
      setProposeModalVisible(false);
      Alert.alert('Success', 'Proposal sent!');
    } else {
      Alert.alert('Error', result.error || 'Failed to propose details');
    }
  };

  const handleConfirm = useCallback(
    async (challengeId: string) => {
      Alert.alert(
        'Confirm Match',
        'Confirm this venue and time? A match will be scheduled.',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes, Confirm',
            onPress: async () => {
              const result = await confirmChallenge(challengeId);
              if (result.success) {
                Alert.alert('Success', 'Match scheduled!');
              } else {
                Alert.alert('Error', result.error || 'Failed to confirm challenge');
              }
            },
          },
        ]
      );
    },
    [confirmChallenge]
  );

  const getStatusColor = (status: ChallengeStatus) => {
    switch (status) {
      case 'pending':
        return '#f1c40f';
      case 'venue_proposed':
      case 'countered':
        return '#3498db';
      case 'locked':
        return '#2ecc71';
      case 'declined':
      case 'cancelled':
      case 'expired':
        return '#e74c3c';
      default:
        return '#888';
    }
  };

  const renderChallenge = ({ item }: { item: ChallengeWithDetails }) => {
    const isChallenger = item.challenger_player_id === player?.id;
    const isChallenged = item.challenged_player_id === player?.id;
    const isProposer = item.proposed_by_player_id === player?.id;

    // Determine available actions
    const canCancel = isChallenger && item.status === 'pending';
    const canDecline = isChallenged && item.status === 'pending';
    const canPropose =
      (item.status === 'pending' && isChallenged) ||
      ((item.status === 'venue_proposed' || item.status === 'countered') && !isProposer);
    const canConfirm =
      (item.status === 'venue_proposed' || item.status === 'countered') && !isProposer;

    return (
      <View style={styles.challengeCard}>
        <View style={styles.challengeHeader}>
          <View
            style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}
          >
            <Text style={styles.statusText}>
              {CHALLENGE_STATUSES[item.status]}
            </Text>
          </View>
          <Text style={styles.discipline}>
            {DISCIPLINES[item.discipline_id as DisciplineId]}
          </Text>
        </View>

        <View style={styles.playersRow}>
          <View style={styles.playerCol}>
            <Text style={styles.playerLabel}>Challenger</Text>
            <Text style={styles.playerName}>{item.challenger_display_name}</Text>
            <Text style={styles.playerRank}>
              #{item.challenger_rank ?? '?'}
            </Text>
          </View>
          <Text style={styles.vs}>vs</Text>
          <View style={styles.playerCol}>
            <Text style={styles.playerLabel}>Challenged</Text>
            <Text style={styles.playerName}>{item.challenged_display_name}</Text>
            <Text style={styles.playerRank}>
              #{item.challenged_rank ?? '?'}
            </Text>
          </View>
        </View>

        {item.venue_name && (
          <View style={styles.venueRow}>
            <Text style={styles.venueLabel}>Venue:</Text>
            <Text style={styles.venueText}>{item.venue_name}</Text>
          </View>
        )}

        {item.scheduled_at && (
          <View style={styles.venueRow}>
            <Text style={styles.venueLabel}>When:</Text>
            <Text style={styles.venueText}>
              {new Date(item.scheduled_at).toLocaleString()}
            </Text>
          </View>
        )}

        <View style={styles.detailsRow}>
          <Text style={styles.raceText}>Race to {item.race_to}</Text>
          <Text style={styles.dateText}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.actionsRow}>
          {canDecline && (
            <TouchableOpacity
              style={styles.declineButton}
              onPress={() => handleDecline(item.id)}
            >
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>
          )}

          {canPropose && (
            <TouchableOpacity
              style={styles.proposeButton}
              onPress={() => openProposeModal(item)}
            >
              <Text style={styles.proposeButtonText}>
                {item.status === 'pending' ? 'Propose Venue/Time' : 'Counter Propose'}
              </Text>
            </TouchableOpacity>
          )}

          {canConfirm && (
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => handleConfirm(item.id)}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          )}

          {canCancel && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancel(item.id)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const adjustDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    if (newDate > new Date()) {
      setSelectedDate(newDate);
    }
  };

  const adjustHour = (hours: number) => {
    const newDate = new Date(selectedDate);
    newDate.setHours(newDate.getHours() + hours);
    setSelectedDate(newDate);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Challenges</Text>
        <View style={{ width: 50 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#e94560" />
        </View>
      ) : challenges.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No challenges yet</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate('CreateChallenge')}
          >
            <Text style={styles.createButtonText}>Create One</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={challenges}
          keyExtractor={(item) => item.id}
          renderItem={renderChallenge}
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

      <Modal
        visible={proposeModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setProposeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Propose Venue & Time</Text>

            <Text style={styles.modalLabel}>Select Venue</Text>
            <ScrollView horizontal style={styles.venueScroll}>
              {venues.map((venue) => (
                <TouchableOpacity
                  key={venue.id}
                  style={[
                    styles.venueOption,
                    selectedVenue?.id === venue.id && styles.venueOptionSelected,
                  ]}
                  onPress={() => setSelectedVenue(venue)}
                >
                  <Text
                    style={[
                      styles.venueOptionText,
                      selectedVenue?.id === venue.id && styles.venueOptionTextSelected,
                    ]}
                  >
                    {venue.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.modalLabel}>Select Date & Time</Text>
            <View style={styles.datePickerRow}>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => adjustDate(-1)}
              >
                <Text style={styles.dateButtonText}>-1 Day</Text>
              </TouchableOpacity>
              <Text style={styles.dateDisplay}>
                {selectedDate.toLocaleDateString()}
              </Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => adjustDate(1)}
              >
                <Text style={styles.dateButtonText}>+1 Day</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.datePickerRow}>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => adjustHour(-1)}
              >
                <Text style={styles.dateButtonText}>-1 Hr</Text>
              </TouchableOpacity>
              <Text style={styles.dateDisplay}>
                {selectedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => adjustHour(1)}
              >
                <Text style={styles.dateButtonText}>+1 Hr</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setProposeModalVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitButton, submitting && styles.buttonDisabled]}
                onPress={handlePropose}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitButtonText}>Propose</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  list: {
    paddingHorizontal: 16,
  },
  challengeCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  challengeHeader: {
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
  playerLabel: {
    color: '#666',
    fontSize: 10,
    marginBottom: 4,
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
  vs: {
    color: '#666',
    fontSize: 14,
    marginHorizontal: 8,
  },
  venueRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  venueLabel: {
    color: '#666',
    fontSize: 12,
    marginRight: 8,
  },
  venueText: {
    color: '#fff',
    fontSize: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#2a2a4e',
  },
  raceText: {
    color: '#888',
    fontSize: 12,
  },
  dateText: {
    color: '#666',
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e74c3c',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#e74c3c',
    fontSize: 14,
  },
  declineButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e74c3c',
    alignItems: 'center',
  },
  declineButtonText: {
    color: '#e74c3c',
    fontSize: 14,
  },
  proposeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#3498db',
    alignItems: 'center',
  },
  proposeButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#2ecc71',
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 14,
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
    marginBottom: 16,
  },
  createButton: {
    backgroundColor: '#e94560',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
  },
  venueScroll: {
    marginBottom: 20,
  },
  venueOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    marginRight: 8,
  },
  venueOptionSelected: {
    backgroundColor: '#e94560',
  },
  venueOptionText: {
    color: '#888',
    fontSize: 14,
  },
  venueOptionTextSelected: {
    color: '#fff',
  },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
  },
  dateButtonText: {
    color: '#e94560',
    fontSize: 14,
  },
  dateDisplay: {
    color: '#fff',
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#666',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  modalSubmitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#e94560',
    alignItems: 'center',
  },
  modalSubmitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

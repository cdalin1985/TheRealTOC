import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

// MOCKUP ONLY - Visual reference for Activity Feed screen
// This file is NOT connected to the actual app

type ActivityType = 
  | 'challenge_sent'
  | 'challenge_accepted'
  | 'challenge_declined'
  | 'venue_proposed'
  | 'match_confirmed'
  | 'match_completed'
  | 'score_submitted'
  | 'ranking_changed'
  | 'payment_received';

interface ActivityItem {
  id: string;
  type: ActivityType;
  timestamp: string;
  actor: string;
  target?: string;
  details: string;
  highlight?: boolean;
}

const MOCK_ACTIVITIES: ActivityItem[] = [
  {
    id: '1',
    type: 'match_completed',
    timestamp: '2:34 PM',
    actor: 'Mike "The Shark" Johnson',
    target: 'Tommy D',
    details: 'Mike beat Tommy 7-5 in 9-ball (Race to 7) at Valley Hub',
    highlight: true,
  },
  {
    id: '2',
    type: 'score_submitted',
    timestamp: '2:30 PM',
    actor: 'Mike "The Shark" Johnson',
    details: 'Submitted score: 7-5 win over Tommy D',
  },
  {
    id: '3',
    type: 'score_submitted',
    timestamp: '2:28 PM',
    actor: 'Tommy D',
    details: 'Submitted score: 5-7 loss to Mike',
  },
  {
    id: '4',
    type: 'ranking_changed',
    timestamp: '2:25 PM',
    actor: 'Sarah Chen',
    details: 'Moved up from #4 to #3 after defeating Big Dave',
    highlight: true,
  },
  {
    id: '5',
    type: 'match_confirmed',
    timestamp: '1:15 PM',
    actor: 'Mike "The Shark" Johnson',
    target: 'Tommy D',
    details: 'Match confirmed for today at 2:00 PM at Valley Hub',
  },
  {
    id: '6',
    type: 'venue_proposed',
    timestamp: 'Yesterday 8:30 PM',
    actor: 'Tommy D',
    target: 'Mike "The Shark" Johnson',
    details: 'Proposed Valley Hub, Today at 2:00 PM',
  },
  {
    id: '7',
    type: 'challenge_sent',
    timestamp: 'Yesterday 6:00 PM',
    actor: 'Mike "The Shark" Johnson',
    target: 'Tommy D',
    details: '9-ball, Race to 7',
  },
  {
    id: '8',
    type: 'payment_received',
    timestamp: 'Yesterday 5:45 PM',
    actor: 'League',
    details: 'Match fee received from Big Dave ($10)',
  },
  {
    id: '9',
    type: 'challenge_declined',
    timestamp: '2 days ago',
    actor: 'Big Dave',
    target: 'Rookie Rick',
    details: 'Dave declined - "Out with back injury, back next week"',
  },
  {
    id: '10',
    type: 'match_completed',
    timestamp: '2 days ago',
    actor: 'Sarah Chen',
    target: 'Big Dave',
    details: 'Sarah beat Big Dave 9-4 in 8-ball (Race to 9) at Eagles 4040',
  },
];

const getActivityIcon = (type: ActivityType): string => {
  switch (type) {
    case 'challenge_sent': return '🎯';
    case 'challenge_accepted': return '✅';
    case 'challenge_declined': return '❌';
    case 'venue_proposed': return '📍';
    case 'match_confirmed': return '🎱';
    case 'match_completed': return '🏆';
    case 'score_submitted': return '📝';
    case 'ranking_changed': return '📈';
    case 'payment_received': return '💰';
    default: return '•';
  }
};

const getActivityColor = (type: ActivityType): string => {
  switch (type) {
    case 'challenge_sent': return '#3498db';
    case 'challenge_accepted': return '#2ecc71';
    case 'challenge_declined': return '#e74c3c';
    case 'venue_proposed': return '#f39c12';
    case 'match_confirmed': return '#9b59b6';
    case 'match_completed': return '#e94560';
    case 'score_submitted': return '#888';
    case 'ranking_changed': return '#f1c40f';
    case 'payment_received': return '#2ecc71';
    default: return '#888';
  }
};

function ActivityCard({ item }: { item: ActivityItem }) {
  return (
    <View style={[styles.card, item.highlight && styles.cardHighlighted]}>
      <View style={styles.iconContainer}>
        <Text style={[styles.icon, { color: getActivityColor(item.type) }]}>
          {getActivityIcon(item.type)}
        </Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.timestamp}>{item.timestamp}</Text>
        <Text style={styles.mainText}>
          <Text style={styles.actor}>{item.actor}</Text>
          {' '}
          {item.target && (
            <>
              vs <Text style={styles.target}>{item.target}</Text>
            </>
          )}
        </Text>
        <Text style={styles.details}>{item.details}</Text>
      </View>
    </View>
  );
}

export default function ActivityFeedMockup() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>The Feed</Text>
        <Text style={styles.headerSubtitle}>Live League Activity</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity style={[styles.filterTab, styles.filterTabActive]}>
          <Text style={styles.filterTabTextActive}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterTab}>
          <Text style={styles.filterTabText}>Matches</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterTab}>
          <Text style={styles.filterTabText}>Challenges</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterTab}>
          <Text style={styles.filterTabText}>Rankings</Text>
        </TouchableOpacity>
      </View>

      {/* Activity List - Chat Style */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {MOCK_ACTIVITIES.map((item) => (
          <ActivityCard key={item.id} item={item} />
        ))}
        
        {/* Load More */}
        <TouchableOpacity style={styles.loadMore}>
          <Text style={styles.loadMoreText}>Load more history...</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Input Area (like chat) */}
      <View style={styles.inputArea}>
        <Text style={styles.inputHint}>
          Tap any activity to see details
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#16213e',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4e',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4e',
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#16213e',
  },
  filterTabActive: {
    backgroundColor: '#e94560',
  },
  filterTabText: {
    color: '#888',
    fontSize: 14,
  },
  filterTabTextActive: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2a2a4e',
  },
  cardHighlighted: {
    borderLeftColor: '#e94560',
    backgroundColor: '#1e2a4a',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  timestamp: {
    color: '#666',
    fontSize: 12,
    marginBottom: 4,
  },
  mainText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 4,
  },
  actor: {
    fontWeight: 'bold',
    color: '#e94560',
  },
  target: {
    fontWeight: 'bold',
    color: '#fff',
  },
  details: {
    color: '#888',
    fontSize: 14,
    lineHeight: 20,
  },
  loadMore: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadMoreText: {
    color: '#666',
    fontSize: 14,
  },
  inputArea: {
    padding: 16,
    backgroundColor: '#16213e',
    borderTopWidth: 1,
    borderTopColor: '#2a2a4e',
  },
  inputHint: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
});

/*
VISUAL DESIGN NOTES:
===================

1. CHAT-STYLE FEED
   - Activities stack vertically like chat messages
   - Newest at top (like our current conversation)
   - Scroll up to see older history
   - Each item has timestamp

2. ICON SYSTEM
   - Every activity type has a unique emoji/icon
   - Color-coded by type (challenges=blue, matches=purple, etc.)
   - Icons in circular containers for visual consistency

3. HIGHLIGHTING
   - Important activities (match results, ranking changes) get:
     - Red left border
     - Slightly different background
   - Makes key events stand out while scrolling

4. FILTER TABS
   - "All" | "Matches" | "Challenges" | "Rankings"
   - Lets users focus on what they care about
   - Active tab highlighted in red

5. CONTENT STRUCTURE
   Each activity shows:
   - Timestamp (when it happened)
   - Actor (who did it)
   - Target (who it involved, if anyone)
   - Details (what happened)

6. SCROLL BEHAVIOR
   - Smooth scrolling like chat
   - "Load more history" at bottom for pagination
   - Could add pull-to-refresh for latest

POTENTIAL ENHANCEMENTS:
- Tap activity to expand full details
- Long-press to share/copy
- Push notification badge on new items
- Auto-scroll to bottom on new activity
- Search/filter by player name
*/

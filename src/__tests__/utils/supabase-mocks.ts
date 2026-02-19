// Test utilities and mocks for Supabase
import { vi } from 'vitest';

// Mock Supabase client
export const mockSupabaseClient = {
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  },
  from: vi.fn(() => mockQueryBuilder),
  rpc: vi.fn(),
  channel: vi.fn(() => mockChannel),
};

// Mock query builder for chained methods
export const mockQueryBuilder = {
  select: vi.fn(() => mockQueryBuilder),
  insert: vi.fn(() => mockQueryBuilder),
  update: vi.fn(() => mockQueryBuilder),
  delete: vi.fn(() => mockQueryBuilder),
  eq: vi.fn(() => mockQueryBuilder),
  or: vi.fn(() => mockQueryBuilder),
  order: vi.fn(() => mockQueryBuilder),
  limit: vi.fn(() => mockQueryBuilder),
  single: vi.fn(() => mockQueryBuilder),
  lt: vi.fn(() => mockQueryBuilder),
  then: vi.fn(),
};

// Mock realtime channel
export const mockChannel = {
  on: vi.fn(() => mockChannel),
  subscribe: vi.fn(() => mockChannel),
  unsubscribe: vi.fn(),
};

// Helper to reset all mocks
export function resetSupabaseMocks() {
  vi.clearAllMocks();
  
  // Reset default implementations
  mockSupabaseClient.auth.getSession.mockResolvedValue({ data: { session: null } });
  mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({ 
    data: { subscription: { unsubscribe: vi.fn() } } 
  });
  
  // Reset query builder methods to return self for chaining
  Object.keys(mockQueryBuilder).forEach(key => {
    if (key !== 'then') {
      mockQueryBuilder[key as keyof typeof mockQueryBuilder].mockReturnValue(mockQueryBuilder);
    }
  });
}

// Factory functions for test data
export function createMockProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'user-123',
    display_name: 'Test Player',
    avatar_url: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createMockPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'player-123',
    profile_id: 'user-123',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createMockRank(overrides: Partial<Rank> = {}): Rank {
  return {
    id: 'rank-123',
    player_id: 'player-123',
    rank_position: 5,
    points: 100,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createMockChallenge(overrides: Partial<Challenge> = {}): Challenge {
  return {
    id: 'challenge-123',
    challenger_player_id: 'player-123',
    challenged_player_id: 'player-456',
    discipline_id: '8-ball',
    race_to: 5,
    status: 'pending',
    venue_id: null,
    scheduled_at: null,
    proposed_by_player_id: null,
    locked_at: null,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createMockMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'match-123',
    challenge_id: 'challenge-123',
    challenger_player_id: 'player-123',
    challenged_player_id: 'player-456',
    discipline_id: '8-ball',
    race_to: 5,
    venue_id: 'venue-123',
    scheduled_at: '2024-01-15T19:00:00Z',
    status: 'scheduled',
    challenger_games: null,
    challenged_games: null,
    challenger_submitted_at: null,
    challenged_submitted_at: null,
    finalized_at: null,
    livestream_url: null,
    disputed_reason: null,
    winner_player_id: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createMockTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-123',
    player_id: 'player-123',
    type: 'income',
    category: 'match_fee',
    amount: 1000,
    description: 'Match fee',
    related_match_id: null,
    admin_id: null,
    created_at: '2024-01-01T00:00:00Z',
    balance_after: 5000,
    ...overrides,
  };
}

export function createMockActivityItem(overrides: Partial<ActivityItem> = {}): ActivityItem {
  return {
    id: 'activity-123',
    type: 'challenge_sent',
    actor_player_id: 'player-123',
    target_player_id: 'player-456',
    challenge_id: 'challenge-123',
    match_id: null,
    description: 'Player A challenged Player B',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createMockVenue(overrides: Partial<Venue> = {}): Venue {
  return {
    id: 'venue-123',
    name: 'Valley Hub',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

// Type imports (these will be resolved by Jest)
import type { Profile, Player, Rank, Challenge, Match } from '../types/database';
import type { Transaction, ActivityItem } from '../types/treasury';
import type { Venue } from '../types/database';

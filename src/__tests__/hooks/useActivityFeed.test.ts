import { renderHook, waitFor } from '@testing-library/react-native';
import { useActivityFeed, useFilteredActivityFeed } from '../useActivityFeed';
import { supabase } from '../../lib/supabase';

// Mock supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    channel: jest.fn(),
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('useActivityFeed', () => {
  const mockActivities = [
    {
      id: '1',
      type: 'challenge_sent',
      actor_player_id: 'player1',
      target_player_id: 'player2',
      challenge_id: 'challenge1',
      match_id: null,
      description: 'Challenge sent: Race to 7',
      created_at: '2025-02-19T10:00:00Z',
      actor_name: 'Mike Johnson',
      target_name: 'Tommy D',
    },
    {
      id: '2',
      type: 'match_completed',
      actor_player_id: 'player1',
      target_player_id: 'player2',
      challenge_id: null,
      match_id: 'match1',
      description: 'Mike beat Tommy 7-5',
      created_at: '2025-02-19T09:00:00Z',
      actor_name: 'Mike Johnson',
      target_name: 'Tommy D',
      challenger_games: 7,
      challenged_games: 5,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch activities on mount', async () => {
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: mockActivities, error: null }),
    };

    const mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    };

    (supabase.from as jest.Mock).mockReturnValue(mockQuery);
    (supabase.channel as jest.Mock).mockReturnValue(mockChannel);

    const { result } = renderHook(() => useActivityFeed({ playerId: 'player1' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.activities).toHaveLength(2);
    expect(result.current.activities[0].actor_name).toBe('Mike Johnson');
  });

  it('should filter activities by type', async () => {
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: mockActivities, error: null }),
    };

    const mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    };

    (supabase.from as jest.Mock).mockReturnValue(mockQuery);
    (supabase.channel as jest.Mock).mockReturnValue(mockChannel);

    const { result } = renderHook(() =>
      useFilteredActivityFeed({
        playerId: 'player1',
        typeFilter: 'match_completed',
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Note: Client-side filtering happens after fetch
    expect(result.current.activities).toHaveLength(1);
    expect(result.current.activities[0].type).toBe('match_completed');
  });

  it('should handle errors gracefully', async () => {
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Network error' },
      }),
    };

    const mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    };

    (supabase.from as jest.Mock).mockReturnValue(mockQuery);
    (supabase.channel as jest.Mock).mockReturnValue(mockChannel);

    const { result } = renderHook(() => useActivityFeed({ playerId: 'player1' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
  });
});

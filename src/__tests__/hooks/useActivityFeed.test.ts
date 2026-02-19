import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useActivityFeed, useFilteredActivityFeed } from '../hooks/useActivityFeed';
import { supabase } from '../lib/supabase';

// Mock supabase
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => mockQueryBuilder),
    channel: jest.fn(() => mockChannel),
  },
}));

const mockQueryBuilder: any = {
  select: jest.fn(() => mockQueryBuilder),
  order: jest.fn(() => mockQueryBuilder),
  limit: jest.fn(() => mockQueryBuilder),
  eq: jest.fn(() => mockQueryBuilder),
  lt: jest.fn(() => mockQueryBuilder),
  single: jest.fn(),
};

const mockChannel = {
  on: jest.fn(() => mockChannel),
  subscribe: jest.fn(() => mockChannel),
  unsubscribe: jest.fn(),
};

describe('useActivityFeed', () => {
  const mockActivity = {
    id: 'activity-1',
    type: 'challenge_sent',
    actor_player_id: 'player-123',
    target_player_id: 'player-456',
    challenge_id: 'challenge-1',
    match_id: null,
    description: 'Player A challenged Player B',
    created_at: '2024-01-01T00:00:00Z',
    actor: {
      profiles: { display_name: 'Player A' },
    },
    target: {
      profiles: { display_name: 'Player B' },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.order.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.limit.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.eq.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.lt.mockReturnValue(mockQueryBuilder);
  });

  describe('Initial State & Data Fetching', () => {
    it('should start with loading state', () => {
      mockQueryBuilder.limit.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useActivityFeed());

      expect(result.current.loading).toBe(true);
    });

    it('should fetch activities on mount', async () => {
      mockQueryBuilder.limit.mockResolvedValue({ data: [mockActivity], error: null });

      const { result } = renderHook(() => useActivityFeed());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(supabase.from).toHaveBeenCalledWith('activity_log');
      expect(result.current.activities).toHaveLength(1);
      expect(result.current.activities[0].actor_name).toBe('Player A');
      expect(result.current.activities[0].target_name).toBe('Player B');
    });

    it('should handle fetch error', async () => {
      mockQueryBuilder.limit.mockResolvedValue({ 
        data: null, 
        error: { message: 'Database error' } 
      });

      const { result } = renderHook(() => useActivityFeed());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Database error');
      expect(result.current.activities).toEqual([]);
    });

    it('should format activity data correctly', async () => {
      mockQueryBuilder.limit.mockResolvedValue({ data: [mockActivity], error: null });

      const { result } = renderHook(() => useActivityFeed());

      await waitFor(() => {
        expect(result.current.activities).toHaveLength(1);
      });

      const activity = result.current.activities[0];
      expect(activity).toMatchObject({
        id: 'activity-1',
        type: 'challenge_sent',
        actor_player_id: 'player-123',
        target_player_id: 'player-456',
        challenge_id: 'challenge-1',
        description: 'Player A challenged Player B',
        actor_name: 'Player A',
        target_name: 'Player B',
      });
    });
  });

  describe('Pagination', () => {
    it('should set hasMore to true when full page returned', async () => {
      const activities = Array(50).fill(null).map((_, i) => ({
        ...mockActivity,
        id: `activity-${i}`,
      }));

      mockQueryBuilder.limit.mockResolvedValue({ data: activities, error: null });

      const { result } = renderHook(() => useActivityFeed());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasMore).toBe(true);
    });

    it('should set hasMore to false when partial page returned', async () => {
      const activities = Array(30).fill(null).map((_, i) => ({
        ...mockActivity,
        id: `activity-${i}`,
      }));

      mockQueryBuilder.limit.mockResolvedValue({ data: activities, error: null });

      const { result } = renderHook(() => useActivityFeed());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasMore).toBe(false);
    });

    it('should load more activities', async () => {
      const firstPage = Array(50).fill(null).map((_, i) => ({
        ...mockActivity,
        id: `activity-${i}`,
        created_at: `2024-01-${String(50-i).padStart(2, '0')}T00:00:00Z`,
      }));

      mockQueryBuilder.limit.mockResolvedValueOnce({ data: firstPage, error: null });
      mockQueryBuilder.single.mockResolvedValueOnce({ 
        data: { created_at: '2024-01-01T00:00:00Z' }, 
        error: null 
      });
      mockQueryBuilder.limit.mockResolvedValueOnce({ data: [], error: null });

      const { result } = renderHook(() => useActivityFeed());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.activities).toHaveLength(50);

      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.activities).toHaveLength(50); // Second page was empty
    });
  });

  describe('Real-time Subscription', () => {
    it('should subscribe to activity changes', async () => {
      mockQueryBuilder.limit.mockResolvedValue({ data: [], error: null });

      renderHook(() => useActivityFeed());

      await waitFor(() => {
        expect(supabase.channel).toHaveBeenCalledWith('activity_log_changes');
      });

      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_log' },
        expect.any(Function)
      );
    });

    it('should add new activity to top of list on real-time update', async () => {
      mockQueryBuilder.limit.mockResolvedValue({ data: [mockActivity], error: null });

      const { result } = renderHook(() => useActivityFeed());

      await waitFor(() => {
        expect(result.current.activities).toHaveLength(1);
      });

      // Simulate real-time update
      const newActivity = {
        id: 'activity-2',
        type: 'match_completed',
        actor_player_id: 'player-456',
        target_player_id: 'player-123',
        challenge_id: null,
        match_id: 'match-1',
        description: 'Match completed',
        created_at: '2024-01-02T00:00:00Z',
      };

      // Get the callback passed to channel.on
      const onCallback = mockChannel.on.mock.calls[0][2];
      
      act(() => {
        onCallback({ new: newActivity });
      });

      expect(result.current.activities).toHaveLength(2);
      expect(result.current.activities[0].id).toBe('activity-2');
      expect(result.current.activities[1].id).toBe('activity-1');
    });

    it('should unsubscribe on unmount', async () => {
      mockQueryBuilder.limit.mockResolvedValue({ data: [], error: null });

      const { unmount } = renderHook(() => useActivityFeed());

      await waitFor(() => {
        expect(supabase.channel).toHaveBeenCalled();
      });

      unmount();

      expect(mockChannel.unsubscribe).toHaveBeenCalled();
    });
  });

  describe('Refresh', () => {
    it('should refresh activities', async () => {
      mockQueryBuilder.limit.mockResolvedValue({ data: [mockActivity], error: null });

      const { result } = renderHook(() => useActivityFeed());

      await waitFor(() => expect(result.current.loading).toBe(false));

      // Clear mocks
      jest.clearAllMocks();
      mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.order.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.limit.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.limit.mockResolvedValue({ data: [], error: null });

      await act(async () => {
        await result.current.refresh();
      });

      expect(supabase.from).toHaveBeenCalledWith('activity_log');
    });
  });
});

describe('useFilteredActivityFeed', () => {
  const mockActivities = [
    { id: '1', type: 'challenge_sent', description: 'Challenge sent' },
    { id: '2', type: 'match_completed', description: 'Match completed' },
    { id: '3', type: 'challenge_sent', description: 'Another challenge' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.order.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.limit.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.limit.mockResolvedValue({ data: mockActivities, error: null });
  });

  it('should return all activities when no filter', async () => {
    const { result } = renderHook(() => useFilteredActivityFeed());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.activities).toHaveLength(3);
  });

  it('should filter activities by type', async () => {
    const { result } = renderHook(() => useFilteredActivityFeed('challenge_sent'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.activities).toHaveLength(2);
    expect(result.current.activities.every(a => a.type === 'challenge_sent')).toBe(true);
  });

  it('should return empty array when no activities match filter', async () => {
    const { result } = renderHook(() => useFilteredActivityFeed('player_joined'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.activities).toHaveLength(0);
  });
});

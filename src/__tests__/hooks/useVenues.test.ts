import { renderHook, waitFor } from '@testing-library/react-native';
import { useVenues } from '../hooks/useVenues';
import { supabase } from '../lib/supabase';

// Mock supabase
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => mockQueryBuilder),
  },
}));

const mockQueryBuilder: any = {
  select: jest.fn(() => mockQueryBuilder),
  order: jest.fn(() => mockQueryBuilder),
};

describe('useVenues', () => {
  const mockVenues = [
    {
      id: 'venue-1',
      name: 'Eagles 4040',
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'venue-2',
      name: 'Valley Hub',
      created_at: '2024-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.order.mockReturnValue(mockQueryBuilder);
  });

  describe('Initial State', () => {
    it('should start with loading state', () => {
      mockQueryBuilder.order.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useVenues());

      expect(result.current.loading).toBe(true);
      expect(result.current.venues).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch venues on mount', async () => {
      mockQueryBuilder.order.mockResolvedValue({ data: mockVenues, error: null });

      const { result } = renderHook(() => useVenues());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(supabase.from).toHaveBeenCalledWith('venues');
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('name');
      expect(result.current.venues).toHaveLength(2);
      expect(result.current.venues[0].name).toBe('Eagles 4040');
      expect(result.current.venues[1].name).toBe('Valley Hub');
    });

    it('should handle empty venues list', async () => {
      mockQueryBuilder.order.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useVenues());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.venues).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch error', async () => {
      mockQueryBuilder.order.mockResolvedValue({ 
        data: null, 
        error: { message: 'Database connection failed' } 
      });

      const { result } = renderHook(() => useVenues());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Database connection failed');
      expect(result.current.venues).toEqual([]);
    });

    it('should handle null data response', async () => {
      mockQueryBuilder.order.mockResolvedValue({ data: null, error: null });

      const { result } = renderHook(() => useVenues());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.venues).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Venue Data Structure', () => {
    it('should preserve venue data structure', async () => {
      mockQueryBuilder.order.mockResolvedValue({ data: mockVenues, error: null });

      const { result } = renderHook(() => useVenues());

      await waitFor(() => {
        expect(result.current.venues).toHaveLength(2);
      });

      const venue = result.current.venues[0];
      expect(venue).toHaveProperty('id');
      expect(venue).toHaveProperty('name');
      expect(venue).toHaveProperty('created_at');
    });
  });
});

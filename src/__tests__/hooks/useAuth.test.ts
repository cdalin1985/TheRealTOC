import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

// Mock supabase
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ 
        data: { subscription: { unsubscribe: jest.fn() } } 
      })),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(() => mockQueryBuilder),
    rpc: jest.fn(),
  },
}));

const mockQueryBuilder = {
  select: jest.fn(() => mockQueryBuilder),
  update: jest.fn(() => mockQueryBuilder),
  eq: jest.fn(() => mockQueryBuilder),
  single: jest.fn(),
};

// Mock react-native-url-polyfill
jest.mock('react-native-url-polyfill/auto', () => ({}));

describe('useAuth', () => {
  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00Z',
    role: 'authenticated',
  };

  const mockSession: Session = {
    user: mockUser,
    access_token: 'test-token',
    refresh_token: 'test-refresh',
    expires_in: 3600,
    token_type: 'bearer',
  };

  const mockProfile = {
    id: 'user-123',
    display_name: 'Test Player',
    avatar_url: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.update.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.eq.mockReturnValue(mockQueryBuilder);
  });

  describe('Initial State', () => {
    it('should start with loading state', () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });
      
      const { result } = renderHook(() => useAuth());
      
      expect(result.current.loading).toBe(true);
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });

    it('should load session on mount', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({ 
        data: { session: mockSession } 
      });
      mockQueryBuilder.single.mockResolvedValue({ data: mockProfile, error: null });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.session).toEqual(mockSession);
      expect(result.current.user).toEqual(mockUser);
    });

    it('should handle null session gracefully', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({ 
        data: { session: null } 
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(result.current.profile).toBeNull();
    });
  });

  describe('Authentication Actions', () => {
    it('should sign in successfully', async () => {
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({ error: null });

      (supabase.auth.getSession as jest.Mock).mockResolvedValue({ 
        data: { session: null } 
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.loading).toBe(false));

      let signInResult;
      await act(async () => {
        signInResult = await result.current.signIn('test@example.com', 'password123');
      });

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(signInResult.error).toBeNull();
    });

    it('should handle sign in error', async () => {
      const mockError = new Error('Invalid credentials');
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({ error: mockError });

      (supabase.auth.getSession as jest.Mock).mockResolvedValue({ 
        data: { session: null } 
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.loading).toBe(false));

      let signInResult;
      await act(async () => {
        signInResult = await result.current.signIn('test@example.com', 'wrong');
      });

      expect(signInResult.error).toEqual(mockError);
    });

    it('should sign up successfully', async () => {
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({ error: null });

      (supabase.auth.getSession as jest.Mock).mockResolvedValue({ 
        data: { session: null } 
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.loading).toBe(false));

      let signUpResult;
      await act(async () => {
        signUpResult = await result.current.signUp('new@example.com', 'password123');
      });

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
      });
      expect(signUpResult.error).toBeNull();
    });

    it('should sign out successfully', async () => {
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });

      (supabase.auth.getSession as jest.Mock).mockResolvedValue({ 
        data: { session: null } 
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.loading).toBe(false));

      let signOutResult;
      await act(async () => {
        signOutResult = await result.current.signOut();
      });

      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(signOutResult.error).toBeNull();
    });
  });

  describe('Profile Management', () => {
    it('should fetch profile when session exists', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({ 
        data: { session: mockSession } 
      });
      mockQueryBuilder.single.mockResolvedValue({ data: mockProfile, error: null });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.profile).toEqual(mockProfile);
      });

      expect(supabase.from).toHaveBeenCalledWith('profiles');
    });

    it('should update profile successfully', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({ 
        data: { session: mockSession } 
      });
      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: mockProfile, error: null })
        .mockResolvedValueOnce({ data: { ...mockProfile, display_name: 'New Name' }, error: null });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.updateProfile({ display_name: 'New Name' });
      });

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ display_name: 'New Name' })
      );
    });

    it('should return error when updating profile without user', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({ 
        data: { session: null } 
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.loading).toBe(false));

      let updateResult;
      await act(async () => {
        updateResult = await result.current.updateProfile({ display_name: 'New Name' });
      });

      expect(updateResult.error).toBeInstanceOf(Error);
      expect(updateResult.error.message).toBe('Not authenticated');
    });
  });

  describe('Profile Setup Check', () => {
    it('should return true if display_name is missing', () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({ 
        data: { session: mockSession } 
      });
      mockQueryBuilder.single.mockResolvedValue({ 
        data: { ...mockProfile, display_name: null }, 
        error: null 
      });

      const { result } = renderHook(() => useAuth());

      // Wait for profile to load then check
      waitFor(() => {
        expect(result.current.needsProfileSetup()).toBe(true);
      });
    });

    it('should return true if display_name starts with Player_', () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({ 
        data: { session: mockSession } 
      });
      mockQueryBuilder.single.mockResolvedValue({ 
        data: { ...mockProfile, display_name: 'Player_12345' }, 
        error: null 
      });

      const { result } = renderHook(() => useAuth());

      waitFor(() => {
        expect(result.current.needsProfileSetup()).toBe(true);
      });
    });

    it('should return false if profile has valid display_name', () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({ 
        data: { session: mockSession } 
      });
      mockQueryBuilder.single.mockResolvedValue({ data: mockProfile, error: null });

      const { result } = renderHook(() => useAuth());

      waitFor(() => {
        expect(result.current.needsProfileSetup()).toBe(false);
      });
    });

    it('should return false if no profile exists', () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({ 
        data: { session: null } 
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.needsProfileSetup()).toBe(false);
    });
  });

  describe('Auth State Change Listener', () => {
    it('should subscribe to auth state changes', async () => {
      const unsubscribe = jest.fn();
      (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
        data: { subscription: { unsubscribe } },
      });

      (supabase.auth.getSession as jest.Mock).mockResolvedValue({ 
        data: { session: null } 
      });

      const { unmount } = renderHook(() => useAuth());

      expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();

      unmount();
      expect(unsubscribe).toHaveBeenCalled();
    });
  });
});

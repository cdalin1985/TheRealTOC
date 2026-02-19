import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useAuth } from '../../hooks/useAuth';
import { Session, User } from '@supabase/supabase-js';

// Create mock functions
const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockSignUp = jest.fn();
const mockSignOut = jest.fn();
const mockFrom = jest.fn();
const mockRpc = jest.fn();

// Mock supabase module
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: any[]) => mockGetSession(...args),
      onAuthStateChange: (...args: any[]) => mockOnAuthStateChange(...args),
      signInWithPassword: (...args: any[]) => mockSignInWithPassword(...args),
      signUp: (...args: any[]) => mockSignUp(...args),
      signOut: (...args: any[]) => mockSignOut(...args),
    },
    from: (...args: any[]) => mockFrom(...args),
    rpc: (...args: any[]) => mockRpc(...args),
  },
}));

const mockQueryBuilder = {
  select: jest.fn(() => mockQueryBuilder),
  update: jest.fn(() => mockQueryBuilder),
  eq: jest.fn(() => mockQueryBuilder),
  single: jest.fn(() => mockQueryBuilder),
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
    mockFrom.mockReturnValue(mockQueryBuilder);
    mockOnAuthStateChange.mockReturnValue({ 
      data: { subscription: { unsubscribe: jest.fn() } } 
    });
  });

  describe('Initial State', () => {
    it('should start with loading state', () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      
      const { result } = renderHook(() => useAuth());
      
      expect(result.current.loading).toBe(true);
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });

    it('should load session on mount', async () => {
      mockGetSession.mockResolvedValue({ data: { session: mockSession } });
      mockQueryBuilder.single.mockResolvedValue({ data: mockProfile, error: null });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.session).toEqual(mockSession);
      expect(result.current.user).toEqual(mockUser);
    });

    it('should handle null session gracefully', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

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
      mockGetSession.mockResolvedValue({ data: { session: null } });
      mockSignInWithPassword.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.loading).toBe(false));

      let signInResult: any;
      await act(async () => {
        signInResult = await result.current.signIn('test@example.com', 'password123');
      });

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(signInResult.error).toBeNull();
    });

    it('should handle sign in error', async () => {
      const mockError = new Error('Invalid credentials');
      mockGetSession.mockResolvedValue({ data: { session: null } });
      mockSignInWithPassword.mockResolvedValue({ error: mockError });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.loading).toBe(false));

      let signInResult: any;
      await act(async () => {
        signInResult = await result.current.signIn('test@example.com', 'wrong');
      });

      expect(signInResult.error).toEqual(mockError);
    });

    it('should sign up successfully', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      mockSignUp.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.loading).toBe(false));

      let signUpResult: any;
      await act(async () => {
        signUpResult = await result.current.signUp('new@example.com', 'password123');
      });

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
      });
      expect(signUpResult.error).toBeNull();
    });

    it('should sign out successfully', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      mockSignOut.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.loading).toBe(false));

      let signOutResult: any;
      await act(async () => {
        signOutResult = await result.current.signOut();
      });

      expect(mockSignOut).toHaveBeenCalled();
      expect(signOutResult.error).toBeNull();
    });
  });

  describe('Profile Management', () => {
    it('should fetch profile when session exists', async () => {
      mockGetSession.mockResolvedValue({ data: { session: mockSession } });
      mockQueryBuilder.single.mockResolvedValue({ data: mockProfile, error: null });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.profile).toEqual(mockProfile);
      });

      expect(mockFrom).toHaveBeenCalledWith('profiles');
    });

    it('should update profile successfully', async () => {
      mockGetSession.mockResolvedValue({ data: { session: mockSession } });
      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: mockProfile, error: null })
        .mockResolvedValueOnce({ data: { ...mockProfile, display_name: 'New Name' }, error: null });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.updateProfile({ display_name: 'New Name' });
      });

      expect(mockFrom).toHaveBeenCalledWith('profiles');
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ display_name: 'New Name' })
      );
    });

    it('should return error when updating profile without user', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => expect(result.current.loading).toBe(false));

      let updateResult: any;
      await act(async () => {
        updateResult = await result.current.updateProfile({ display_name: 'New Name' });
      });

      expect(updateResult.error).toBeInstanceOf(Error);
      expect(updateResult.error.message).toBe('Not authenticated');
    });
  });

  describe('Profile Setup Check', () => {
    it('should return true if display_name is missing', async () => {
      mockGetSession.mockResolvedValue({ data: { session: mockSession } });
      mockQueryBuilder.single.mockResolvedValue({ 
        data: { ...mockProfile, display_name: null }, 
        error: null 
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.needsProfileSetup()).toBe(true);
      });
    });

    it('should return true if display_name starts with Player_', async () => {
      mockGetSession.mockResolvedValue({ data: { session: mockSession } });
      mockQueryBuilder.single.mockResolvedValue({ 
        data: { ...mockProfile, display_name: 'Player_12345' }, 
        error: null 
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.needsProfileSetup()).toBe(true);
      });
    });

    it('should return false if profile has valid display_name', async () => {
      mockGetSession.mockResolvedValue({ data: { session: mockSession } });
      mockQueryBuilder.single.mockResolvedValue({ data: mockProfile, error: null });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.needsProfileSetup()).toBe(false);
      });
    });

    it('should return false if no profile exists', () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      const { result } = renderHook(() => useAuth());

      expect(result.current.needsProfileSetup()).toBe(false);
    });
  });

  describe('Auth State Change Listener', () => {
    it('should subscribe to auth state changes', async () => {
      const unsubscribe = jest.fn();
      mockOnAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe } },
      });
      mockGetSession.mockResolvedValue({ data: { session: null } });

      const { unmount } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(mockOnAuthStateChange).toHaveBeenCalled();
      });

      unmount();
      expect(unsubscribe).toHaveBeenCalled();
    });
  });
});

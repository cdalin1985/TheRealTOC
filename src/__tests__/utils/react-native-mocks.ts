// React Native and Expo mocks
import { vi } from 'vitest';

// Mock react-native
vi.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: vi.fn((obj: any) => obj.ios),
  },
  Dimensions: {
    get: vi.fn(() => ({ width: 375, height: 812 })),
    addEventListener: vi.fn(() => ({ remove: vi.fn() })),
  },
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (styles: any) => styles,
  },
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  FlatList: 'FlatList',
  ActivityIndicator: 'ActivityIndicator',
  TextInput: 'TextInput',
  SafeAreaView: 'SafeAreaView',
  StatusBar: 'StatusBar',
  Image: 'Image',
  Pressable: 'Pressable',
  Modal: 'Modal',
  Alert: {
    alert: vi.fn(),
  },
  Linking: {
    openURL: vi.fn(),
    canOpenURL: vi.fn(() => Promise.resolve(true)),
  },
  AsyncStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

// Mock expo modules
vi.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

vi.mock('expo-constants', () => ({
  default: {
    manifest: {},
    expoConfig: {},
  },
}));

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

// Mock react-native-safe-area-context
vi.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

// Mock react-native-screens
vi.mock('react-native-screens', () => ({
  enableScreens: vi.fn(),
}));

// Mock @react-navigation/native
vi.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: vi.fn(),
    goBack: vi.fn(),
    setOptions: vi.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock @react-navigation/native-stack
vi.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: () => null,
  }),
}));

// Mock react-native-url-polyfill
vi.mock('react-native-url-polyfill/auto', () => ({}));

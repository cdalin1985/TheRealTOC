// Test setup file - runs before all tests
import { vi } from 'vitest';

// Set up environment variables
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-key';

// Global test timeout
vi.setConfig({ testTimeout: 10000 });

// Suppress console warnings during tests (optional)
const originalConsoleWarn = console.warn;
console.warn = (...args: any[]) => {
  // Filter out specific warnings if needed
  if (args[0]?.includes?.('ReactDOMTestUtils.act')) return;
  originalConsoleWarn(...args);
};

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});

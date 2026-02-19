# TheRealTOC Testing Documentation

## Overview

This document describes the comprehensive testing setup for TheRealTOC pool league app.

## Test Structure

```
src/__tests__/
├── hooks/                    # Unit tests for React hooks
│   ├── useAuth.test.ts       # Authentication hook tests
│   ├── useChallenges.test.ts # Challenge management tests
│   ├── useMatches.test.ts    # Match management tests
│   ├── useTreasury.test.ts   # Treasury/financial tests
│   ├── useActivityFeed.test.ts # Activity feed tests
│   ├── usePlayer.test.ts     # Player data tests
│   └── useVenues.test.ts     # Venue data tests
├── integration/              # Integration tests
│   ├── challenge-flow.test.ts  # Challenge lifecycle tests
│   └── match-completion.test.ts # Match completion flow tests
├── utils/                    # Test utilities
│   ├── setup.ts              # Jest setup configuration
│   ├── supabase-mocks.ts     # Supabase mocking utilities
│   └── react-native-mocks.ts # React Native mocks
├── challenge.test.ts         # Challenge validation tests
├── match.test.ts             # Match score validation tests
├── ranking.test.ts           # Ranking algorithm tests
└── schedule.test.ts          # Scheduling tests
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- challenge.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should create"
```

## Test Categories

### P0: Critical Path Tests (Must Have)

#### Challenge Flow
- Challenge creation and acceptance
- Venue proposal and confirmation
- Match creation from confirmed challenge

#### Match Completion
- Score submission (both players agree)
- Score dispute (different scores)
- Match status transitions

### P1: Important Tests

- Treasury transaction recording
- Activity feed logging
- Player financial summaries
- Ranking calculations

### P2: Edge Cases

- Network errors
- Invalid inputs
- Empty states
- Boundary conditions

## Mocking Strategy

### Supabase Mocks

All Supabase interactions are mocked at the module level:

```typescript
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    rpc: (...args: any[]) => mockRpc(...args),
    channel: (...args: any[]) => mockChannel(...args),
  },
}));
```

### Mock Query Builder

The query builder supports method chaining:

```typescript
const mockQueryBuilder = {
  select: jest.fn(() => mockQueryBuilder),
  insert: jest.fn(() => mockQueryBuilder),
  update: jest.fn(() => mockQueryBuilder),
  eq: jest.fn(() => mockQueryBuilder),
  order: jest.fn(() => mockQueryBuilder),
  limit: jest.fn(() => mockQueryBuilder),
  single: jest.fn(() => mockQueryBuilder),
};
```

## Writing New Tests

### Hook Test Template

```typescript
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useYourHook } from '../../hooks/useYourHook';

const mockFrom = jest.fn();
const mockRpc = jest.fn();

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    rpc: (...args: any[]) => mockRpc(...args),
  },
}));

const mockQueryBuilder = {
  select: jest.fn(() => mockQueryBuilder),
  // ... other methods
};

describe('useYourHook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(mockQueryBuilder);
  });

  it('should do something', async () => {
    // Arrange
    mockQueryBuilder.select.mockResolvedValue({ data: [], error: null });

    // Act
    const { result } = renderHook(() => useYourHook());

    // Assert
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.data).toEqual([]);
  });
});
```

## Coverage Goals

- **Statements**: 70% minimum (currently 93.45%)
- **Branches**: 70% minimum (currently 80.92%)
- **Functions**: 100% (achieved)
- **Lines**: 70% minimum (currently 94.92%)

## CI/CD Integration

Tests are configured to run on every commit. The following checks are enforced:

1. All tests must pass
2. Coverage thresholds must be met
3. No test failures in CI environment

## Best Practices

1. **Test Behavior, Not Implementation**: Test what the hook does, not how it does it
2. **Mock External Dependencies**: Always mock Supabase and external services
3. **Use waitFor**: Use `waitFor` for async state changes
4. **Clean Up**: Use `beforeEach` to reset mocks
5. **Descriptive Names**: Use clear, descriptive test names
6. **Arrange-Act-Assert**: Structure tests with clear sections

## Troubleshooting

### Common Issues

1. **"An update was not wrapped in act()"**: This warning is expected for async state updates in hooks. The tests still pass.

2. **Module not found**: Ensure imports use correct relative paths (`../../hooks/...`)

3. **Mock not working**: Ensure mocks are set up before importing the module under test

## Future Improvements

- [ ] Add E2E tests with Detox
- [ ] Add visual regression tests
- [ ] Add performance tests
- [ ] Add accessibility tests

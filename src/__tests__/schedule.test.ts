import { VENUES } from '../lib/constants';

describe('Venue/Scheduling Constants', () => {
  it('has required canonical venues', () => {
    expect(VENUES['valley-hub']).toBe('Valley Hub');
    expect(VENUES['eagles-4040']).toBe('Eagles 4040');
  });

  it('has exactly 2 canonical venues', () => {
    expect(Object.keys(VENUES)).toHaveLength(2);
  });
});

describe('Challenge Scheduling Workflow', () => {
  const challengeStates = {
    pending: 'pending',
    venue_proposed: 'venue_proposed',
    countered: 'countered',
    locked: 'locked',
  } as const;

  it('follows valid state transitions', () => {
    // pending -> venue_proposed (first proposal by challenged)
    expect(getNextState('pending', 'propose')).toBe('venue_proposed');

    // venue_proposed -> countered (counter by challenger)
    expect(getNextState('venue_proposed', 'counter')).toBe('countered');

    // countered -> venue_proposed (counter by challenged)
    expect(getNextState('countered', 'counter')).toBe('venue_proposed');

    // venue_proposed -> locked (confirm by challenger)
    expect(getNextState('venue_proposed', 'confirm')).toBe('locked');

    // countered -> locked (confirm by challenged)
    expect(getNextState('countered', 'confirm')).toBe('locked');
  });

  it('blocks invalid state transitions', () => {
    // Cannot propose from locked
    expect(getNextState('locked', 'propose')).toBeNull();

    // Cannot confirm from pending
    expect(getNextState('pending', 'confirm')).toBeNull();
  });
});

// Helper to simulate state transitions
function getNextState(
  current: string,
  action: 'propose' | 'counter' | 'confirm'
): string | null {
  const transitions: Record<string, Record<string, string | null>> = {
    pending: {
      propose: 'venue_proposed',
      counter: null,
      confirm: null,
    },
    venue_proposed: {
      propose: null,
      counter: 'countered',
      confirm: 'locked',
    },
    countered: {
      propose: null,
      counter: 'venue_proposed',
      confirm: 'locked',
    },
    locked: {
      propose: null,
      counter: null,
      confirm: null,
    },
  };

  return transitions[current]?.[action] ?? null;
}

import {
  createChallengeSchema,
  validateChallengeContext,
  type CreateChallengeInput,
  type ChallengeValidationContext,
} from '../lib/challenge';
import { MIN_RACE, MAX_RANK_DIFF } from '../lib/constants';

describe('createChallengeSchema', () => {
  it('validates correct input', () => {
    const input = {
      challengedPlayerId: '123e4567-e89b-12d3-a456-426614174000',
      disciplineId: '8-ball' as const,
      raceTo: MIN_RACE,
    };
    expect(() => createChallengeSchema.parse(input)).not.toThrow();
  });

  it('rejects invalid discipline', () => {
    const input = {
      challengedPlayerId: '123e4567-e89b-12d3-a456-426614174000',
      disciplineId: 'snooker',
      raceTo: MIN_RACE,
    };
    expect(() => createChallengeSchema.parse(input)).toThrow();
  });

  it('rejects race_to below minimum', () => {
    const input = {
      challengedPlayerId: '123e4567-e89b-12d3-a456-426614174000',
      disciplineId: '9-ball' as const,
      raceTo: MIN_RACE - 1,
    };
    expect(() => createChallengeSchema.parse(input)).toThrow();
  });

  it('rejects invalid UUID', () => {
    const input = {
      challengedPlayerId: 'not-a-uuid',
      disciplineId: '10-ball' as const,
      raceTo: MIN_RACE,
    };
    expect(() => createChallengeSchema.parse(input)).toThrow();
  });
});

describe('validateChallengeContext', () => {
  const validInput: CreateChallengeInput = {
    challengedPlayerId: 'opponent-id',
    disciplineId: '8-ball',
    raceTo: MIN_RACE,
  };

  it('returns valid for correct context', () => {
    const context: ChallengeValidationContext = {
      challengerPlayerId: 'challenger-id',
      challengerRank: 5,
      challengedRank: 3,
    };
    const result = validateChallengeContext(validInput, context);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('rejects self-challenge', () => {
    const context: ChallengeValidationContext = {
      challengerPlayerId: 'opponent-id', // same as challenged
      challengerRank: 5,
      challengedRank: 5,
    };
    const result = validateChallengeContext(validInput, context);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('yourself');
  });

  it('rejects unranked challenger', () => {
    const context: ChallengeValidationContext = {
      challengerPlayerId: 'challenger-id',
      challengerRank: null,
      challengedRank: 3,
    };
    const result = validateChallengeContext(validInput, context);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('must be ranked');
  });

  it('rejects unranked opponent', () => {
    const context: ChallengeValidationContext = {
      challengerPlayerId: 'challenger-id',
      challengerRank: 5,
      challengedRank: null,
    };
    const result = validateChallengeContext(validInput, context);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Opponent');
  });

  it('rejects rank difference too large', () => {
    const context: ChallengeValidationContext = {
      challengerPlayerId: 'challenger-id',
      challengerRank: 10,
      challengedRank: 3, // diff = 7 > MAX_RANK_DIFF
    };
    const result = validateChallengeContext(validInput, context);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Rank difference');
  });

  it('allows exact MAX_RANK_DIFF difference', () => {
    const context: ChallengeValidationContext = {
      challengerPlayerId: 'challenger-id',
      challengerRank: 1 + MAX_RANK_DIFF,
      challengedRank: 1,
    };
    const result = validateChallengeContext(validInput, context);
    expect(result.valid).toBe(true);
  });
});

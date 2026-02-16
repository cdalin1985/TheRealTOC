import { z } from 'zod';
import { MIN_RACE, MAX_RANK_DIFF, DISCIPLINES } from './constants';

export const createChallengeSchema = z.object({
  challengedPlayerId: z.string().uuid({ message: 'Invalid player ID' }),
  disciplineId: z.enum(['8-ball', '9-ball', '10-ball'], {
    message: 'Discipline must be 8-ball, 9-ball, or 10-ball',
  }),
  raceTo: z
    .number()
    .int({ message: 'Race must be a whole number' })
    .min(MIN_RACE, { message: `Race must be at least ${MIN_RACE}` }),
});

export type CreateChallengeInput = z.infer<typeof createChallengeSchema>;

export interface ChallengeValidationContext {
  challengerPlayerId: string;
  challengerRank: number | null;
  challengedRank: number | null;
}

export interface ChallengeValidationResult {
  valid: boolean;
  error?: string;
}

export function validateChallengeContext(
  input: CreateChallengeInput,
  context: ChallengeValidationContext
): ChallengeValidationResult {
  // Cannot challenge yourself
  if (input.challengedPlayerId === context.challengerPlayerId) {
    return { valid: false, error: 'Cannot challenge yourself' };
  }

  // Both players must be ranked
  if (context.challengerRank === null) {
    return { valid: false, error: 'You must be ranked to create a challenge' };
  }

  if (context.challengedRank === null) {
    return { valid: false, error: 'Opponent must be ranked to be challenged' };
  }

  // Check rank difference
  const rankDiff = Math.abs(context.challengerRank - context.challengedRank);
  if (rankDiff > MAX_RANK_DIFF) {
    return {
      valid: false,
      error: `Rank difference too large. Maximum allowed: ${MAX_RANK_DIFF}, actual: ${rankDiff}`,
    };
  }

  return { valid: true };
}

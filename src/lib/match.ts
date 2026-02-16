/**
 * Match score validation helpers for TOC
 */

export interface ScoreValidationResult {
  valid: boolean;
  error?: string;
  winnerId?: 'challenger' | 'challenged';
}

/**
 * Validates match score against race_to rules:
 * - Exactly one player must have won (reached race_to)
 * - Winner games must equal race_to
 * - Loser games must be between 0 and race_to - 1
 */
export function validateMatchScore(
  challengerGames: number,
  challengedGames: number,
  raceTo: number
): ScoreValidationResult {
  // Both must be non-negative integers
  if (!Number.isInteger(challengerGames) || challengerGames < 0) {
    return { valid: false, error: 'Challenger games must be a non-negative integer' };
  }
  if (!Number.isInteger(challengedGames) || challengedGames < 0) {
    return { valid: false, error: 'Challenged games must be a non-negative integer' };
  }

  const challengerWon = challengerGames === raceTo;
  const challengedWon = challengedGames === raceTo;

  // Exactly one winner
  if (challengerWon && challengedWon) {
    return { valid: false, error: 'Both players cannot win' };
  }
  if (!challengerWon && !challengedWon) {
    return { valid: false, error: `One player must reach ${raceTo} games to win` };
  }

  // Loser must have 0 to raceTo-1 games
  if (challengerWon) {
    if (challengedGames < 0 || challengedGames >= raceTo) {
      return { valid: false, error: `Loser games must be between 0 and ${raceTo - 1}` };
    }
    return { valid: true, winnerId: 'challenger' };
  } else {
    if (challengerGames < 0 || challengerGames >= raceTo) {
      return { valid: false, error: `Loser games must be between 0 and ${raceTo - 1}` };
    }
    return { valid: true, winnerId: 'challenged' };
  }
}

/**
 * Checks if two score submissions match.
 * Both players submit from their perspective (my_games, opponent_games),
 * so we need to verify they agree on the final score.
 */
export function scoresMatch(
  challengerSubmission: { myGames: number; opponentGames: number },
  challengedSubmission: { myGames: number; opponentGames: number }
): boolean {
  // Challenger says: I got X, opponent got Y
  // Challenged says: I got A, opponent got B
  // They match if: X === B and Y === A
  return (
    challengerSubmission.myGames === challengedSubmission.opponentGames &&
    challengerSubmission.opponentGames === challengedSubmission.myGames
  );
}

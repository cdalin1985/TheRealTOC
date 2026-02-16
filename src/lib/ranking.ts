/**
 * Ranking invariant helpers for TOC
 *
 * Core invariant: Global ranks must be unique and contiguous.
 * No two players can have the same rank_position.
 */

import { MAX_RANK_DIFF } from './constants';

export interface RankEntry {
  player_id: string;
  rank_position: number;
  points: number;
}

/**
 * Validates that ranks are unique and contiguous (1, 2, 3, ..., n)
 * Returns true if valid, false otherwise.
 */
export function validateRankingInvariant(ranks: RankEntry[]): boolean {
  if (ranks.length === 0) return true;

  // Sort by rank position
  const sorted = [...ranks].sort((a, b) => a.rank_position - b.rank_position);

  // Check for uniqueness and contiguity
  for (let i = 0; i < sorted.length; i++) {
    const expected = i + 1;
    if (sorted[i].rank_position !== expected) {
      return false;
    }
  }

  // Check for duplicate player_ids
  const playerIds = new Set(ranks.map(r => r.player_id));
  if (playerIds.size !== ranks.length) {
    return false;
  }

  return true;
}

/**
 * Checks if a challenge is valid based on rank difference.
 * Players can only challenge within ±MAX_RANK_DIFF positions.
 */
export function isValidChallengeRankDiff(
  challengerRank: number,
  challengedRank: number
): boolean {
  const diff = Math.abs(challengerRank - challengedRank);
  return diff <= MAX_RANK_DIFF && diff > 0;
}

/**
 * Calculates new rank positions after a challenge match.
 * If challenger wins, they take the defender's position.
 * All players between challenger and defender shift down by 1.
 */
export function calculateRankShift(
  ranks: RankEntry[],
  challengerPlayerId: string,
  defenderPlayerId: string,
  challengerWon: boolean
): RankEntry[] {
  if (!challengerWon) {
    // No rank change if defender wins
    return ranks;
  }

  const challenger = ranks.find(r => r.player_id === challengerPlayerId);
  const defender = ranks.find(r => r.player_id === defenderPlayerId);

  if (!challenger || !defender) {
    throw new Error('Challenger or defender not found in ranks');
  }

  if (challenger.rank_position <= defender.rank_position) {
    // Challenger is already ranked higher or equal, no change
    return ranks;
  }

  const defenderPosition = defender.rank_position;
  const challengerPosition = challenger.rank_position;

  return ranks.map(rank => {
    if (rank.player_id === challengerPlayerId) {
      // Challenger takes defender's position
      return { ...rank, rank_position: defenderPosition };
    } else if (
      rank.rank_position >= defenderPosition &&
      rank.rank_position < challengerPosition
    ) {
      // Everyone between (inclusive of defender) shifts down by 1
      return { ...rank, rank_position: rank.rank_position + 1 };
    }
    return rank;
  });
}

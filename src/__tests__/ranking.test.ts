import {
  validateRankingInvariant,
  calculateRankShift,
  isValidChallengeRankDiff,
  RankEntry,
} from '../lib/ranking';
import { MAX_RANK_DIFF } from '../lib/constants';

describe('validateRankingInvariant', () => {
  it('returns true for empty array', () => {
    expect(validateRankingInvariant([])).toBe(true);
  });

  it('returns true for valid contiguous ranks', () => {
    const ranks: RankEntry[] = [
      { player_id: 'a', rank_position: 1, points: 100 },
      { player_id: 'b', rank_position: 2, points: 90 },
      { player_id: 'c', rank_position: 3, points: 80 },
    ];
    expect(validateRankingInvariant(ranks)).toBe(true);
  });

  it('returns true for valid ranks in any order', () => {
    const ranks: RankEntry[] = [
      { player_id: 'c', rank_position: 3, points: 80 },
      { player_id: 'a', rank_position: 1, points: 100 },
      { player_id: 'b', rank_position: 2, points: 90 },
    ];
    expect(validateRankingInvariant(ranks)).toBe(true);
  });

  it('returns false for non-contiguous ranks (gap)', () => {
    const ranks: RankEntry[] = [
      { player_id: 'a', rank_position: 1, points: 100 },
      { player_id: 'b', rank_position: 3, points: 90 }, // gap: missing 2
    ];
    expect(validateRankingInvariant(ranks)).toBe(false);
  });

  it('returns false for duplicate ranks', () => {
    const ranks: RankEntry[] = [
      { player_id: 'a', rank_position: 1, points: 100 },
      { player_id: 'b', rank_position: 1, points: 90 }, // duplicate rank
    ];
    expect(validateRankingInvariant(ranks)).toBe(false);
  });

  it('returns false for duplicate player_ids', () => {
    const ranks: RankEntry[] = [
      { player_id: 'a', rank_position: 1, points: 100 },
      { player_id: 'a', rank_position: 2, points: 90 }, // duplicate player
    ];
    expect(validateRankingInvariant(ranks)).toBe(false);
  });

  it('returns false for ranks not starting at 1', () => {
    const ranks: RankEntry[] = [
      { player_id: 'a', rank_position: 2, points: 100 },
      { player_id: 'b', rank_position: 3, points: 90 },
    ];
    expect(validateRankingInvariant(ranks)).toBe(false);
  });
});

describe('isValidChallengeRankDiff', () => {
  it('returns true for adjacent ranks', () => {
    expect(isValidChallengeRankDiff(2, 1)).toBe(true);
    expect(isValidChallengeRankDiff(1, 2)).toBe(true);
  });

  it('returns true for ranks within MAX_RANK_DIFF', () => {
    expect(isValidChallengeRankDiff(1, MAX_RANK_DIFF)).toBe(true);
    expect(isValidChallengeRankDiff(10, 10 + MAX_RANK_DIFF)).toBe(true);
  });

  it('returns false for same rank (self challenge)', () => {
    expect(isValidChallengeRankDiff(5, 5)).toBe(false);
  });

  it('returns false for ranks exceeding MAX_RANK_DIFF', () => {
    expect(isValidChallengeRankDiff(1, MAX_RANK_DIFF + 2)).toBe(false);
    expect(isValidChallengeRankDiff(10, 10 + MAX_RANK_DIFF + 1)).toBe(false);
  });
});

describe('calculateRankShift', () => {
  const initialRanks: RankEntry[] = [
    { player_id: 'p1', rank_position: 1, points: 100 },
    { player_id: 'p2', rank_position: 2, points: 90 },
    { player_id: 'p3', rank_position: 3, points: 80 },
    { player_id: 'p4', rank_position: 4, points: 70 },
    { player_id: 'p5', rank_position: 5, points: 60 },
  ];

  it('returns unchanged ranks if challenger loses', () => {
    const result = calculateRankShift(initialRanks, 'p5', 'p2', false);
    expect(result).toEqual(initialRanks);
  });

  it('shifts ranks correctly when challenger wins', () => {
    // p5 (rank 5) beats p2 (rank 2)
    // p5 -> 2, p2 -> 3, p3 -> 4, p4 -> 5
    const result = calculateRankShift(initialRanks, 'p5', 'p2', true);

    expect(result.find(r => r.player_id === 'p1')?.rank_position).toBe(1);
    expect(result.find(r => r.player_id === 'p5')?.rank_position).toBe(2);
    expect(result.find(r => r.player_id === 'p2')?.rank_position).toBe(3);
    expect(result.find(r => r.player_id === 'p3')?.rank_position).toBe(4);
    expect(result.find(r => r.player_id === 'p4')?.rank_position).toBe(5);
  });

  it('maintains invariant after shift', () => {
    const result = calculateRankShift(initialRanks, 'p5', 'p2', true);
    expect(validateRankingInvariant(result)).toBe(true);
  });

  it('handles adjacent rank challenge', () => {
    // p3 (rank 3) beats p2 (rank 2)
    const result = calculateRankShift(initialRanks, 'p3', 'p2', true);

    expect(result.find(r => r.player_id === 'p3')?.rank_position).toBe(2);
    expect(result.find(r => r.player_id === 'p2')?.rank_position).toBe(3);
    expect(validateRankingInvariant(result)).toBe(true);
  });

  it('returns unchanged if challenger already higher ranked', () => {
    // p2 (rank 2) tries to challenge p4 (rank 4) - invalid direction
    const result = calculateRankShift(initialRanks, 'p2', 'p4', true);
    expect(result).toEqual(initialRanks);
  });

  it('throws error for unknown player', () => {
    expect(() => {
      calculateRankShift(initialRanks, 'unknown', 'p2', true);
    }).toThrow('Challenger or defender not found in ranks');
  });
});

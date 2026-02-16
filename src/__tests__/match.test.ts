import { validateMatchScore, scoresMatch } from '../lib/match';
import { MIN_RACE } from '../lib/constants';

describe('validateMatchScore', () => {
  const raceTo = MIN_RACE; // 5

  it('validates correct score with challenger winning', () => {
    const result = validateMatchScore(5, 3, raceTo);
    expect(result.valid).toBe(true);
    expect(result.winnerId).toBe('challenger');
  });

  it('validates correct score with challenged winning', () => {
    const result = validateMatchScore(2, 5, raceTo);
    expect(result.valid).toBe(true);
    expect(result.winnerId).toBe('challenged');
  });

  it('validates perfect game (winner-0)', () => {
    const result = validateMatchScore(5, 0, raceTo);
    expect(result.valid).toBe(true);
    expect(result.winnerId).toBe('challenger');
  });

  it('validates close game (winner to raceTo-1)', () => {
    const result = validateMatchScore(4, 5, raceTo);
    expect(result.valid).toBe(true);
    expect(result.winnerId).toBe('challenged');
  });

  it('rejects both players winning', () => {
    const result = validateMatchScore(5, 5, raceTo);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Both players cannot win');
  });

  it('rejects no winner', () => {
    const result = validateMatchScore(3, 4, raceTo);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('must reach');
  });

  it('rejects loser with too many games', () => {
    const result = validateMatchScore(5, 5, raceTo);
    expect(result.valid).toBe(false);
  });

  it('rejects negative scores', () => {
    const result = validateMatchScore(-1, 5, raceTo);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('non-negative');
  });

  it('rejects non-integer scores', () => {
    const result = validateMatchScore(5.5, 3, raceTo);
    expect(result.valid).toBe(false);
  });

  it('works with higher race_to values', () => {
    const result = validateMatchScore(7, 4, 7);
    expect(result.valid).toBe(true);
    expect(result.winnerId).toBe('challenger');
  });
});

describe('scoresMatch', () => {
  it('returns true when both submissions agree', () => {
    // Challenger says: I won 5-3
    // Challenged says: I lost 3-5
    const challengerSub = { myGames: 5, opponentGames: 3 };
    const challengedSub = { myGames: 3, opponentGames: 5 };
    expect(scoresMatch(challengerSub, challengedSub)).toBe(true);
  });

  it('returns true for reverse scenario', () => {
    // Challenger says: I lost 2-5
    // Challenged says: I won 5-2
    const challengerSub = { myGames: 2, opponentGames: 5 };
    const challengedSub = { myGames: 5, opponentGames: 2 };
    expect(scoresMatch(challengerSub, challengedSub)).toBe(true);
  });

  it('returns false when submissions disagree on winner', () => {
    // Challenger says: I won 5-3
    // Challenged says: I won 5-3 (impossible)
    const challengerSub = { myGames: 5, opponentGames: 3 };
    const challengedSub = { myGames: 5, opponentGames: 3 };
    expect(scoresMatch(challengerSub, challengedSub)).toBe(false);
  });

  it('returns false when submissions disagree on score', () => {
    // Challenger says: I won 5-3
    // Challenged says: I lost 4-5 (different loser score)
    const challengerSub = { myGames: 5, opponentGames: 3 };
    const challengedSub = { myGames: 4, opponentGames: 5 };
    expect(scoresMatch(challengerSub, challengedSub)).toBe(false);
  });
});

describe('Ladder Rank Update Logic', () => {
  // These tests document the expected rank shift behavior
  // Actual implementation is in SQL RPC

  interface RankEntry {
    player_id: string;
    rank: number;
  }

  function simulateLadderUpdate(
    ranks: RankEntry[],
    winnerPlayerId: string,
    loserPlayerId: string
  ): RankEntry[] {
    const winner = ranks.find(r => r.player_id === winnerPlayerId);
    const loser = ranks.find(r => r.player_id === loserPlayerId);

    if (!winner || !loser) throw new Error('Player not found');

    // If higher-ranked (lower number) beats lower-ranked: no change
    if (winner.rank < loser.rank) {
      return ranks;
    }

    // Lower-ranked beats higher-ranked: winner takes loser's spot
    const winnerOldRank = winner.rank;
    const loserRank = loser.rank;

    return ranks.map(r => {
      if (r.player_id === winnerPlayerId) {
        // Winner takes loser's rank
        return { ...r, rank: loserRank };
      } else if (r.rank >= loserRank && r.rank < winnerOldRank) {
        // Everyone between shifts down by 1 (including loser)
        return { ...r, rank: r.rank + 1 };
      }
      return r;
    });
  }

  it('no change when higher-ranked wins', () => {
    const ranks: RankEntry[] = [
      { player_id: 'p1', rank: 1 },
      { player_id: 'p2', rank: 2 },
      { player_id: 'p3', rank: 3 },
    ];

    const result = simulateLadderUpdate(ranks, 'p1', 'p2');

    expect(result.find(r => r.player_id === 'p1')?.rank).toBe(1);
    expect(result.find(r => r.player_id === 'p2')?.rank).toBe(2);
    expect(result.find(r => r.player_id === 'p3')?.rank).toBe(3);
  });

  it('shifts ranks when lower-ranked wins against adjacent', () => {
    const ranks: RankEntry[] = [
      { player_id: 'p1', rank: 1 },
      { player_id: 'p2', rank: 2 },
      { player_id: 'p3', rank: 3 },
    ];

    // p2 beats p1
    const result = simulateLadderUpdate(ranks, 'p2', 'p1');

    expect(result.find(r => r.player_id === 'p2')?.rank).toBe(1); // winner takes spot
    expect(result.find(r => r.player_id === 'p1')?.rank).toBe(2); // loser shifts down
    expect(result.find(r => r.player_id === 'p3')?.rank).toBe(3); // unaffected
  });

  it('shifts multiple ranks when lower-ranked wins from distance', () => {
    const ranks: RankEntry[] = [
      { player_id: 'p1', rank: 1 },
      { player_id: 'p2', rank: 2 },
      { player_id: 'p3', rank: 3 },
      { player_id: 'p4', rank: 4 },
      { player_id: 'p5', rank: 5 },
    ];

    // p5 beats p2
    const result = simulateLadderUpdate(ranks, 'p5', 'p2');

    expect(result.find(r => r.player_id === 'p1')?.rank).toBe(1); // unaffected
    expect(result.find(r => r.player_id === 'p5')?.rank).toBe(2); // winner takes spot
    expect(result.find(r => r.player_id === 'p2')?.rank).toBe(3); // loser shifts
    expect(result.find(r => r.player_id === 'p3')?.rank).toBe(4); // shifts
    expect(result.find(r => r.player_id === 'p4')?.rank).toBe(5); // shifts
  });

  it('maintains contiguous ranks after update', () => {
    const ranks: RankEntry[] = [
      { player_id: 'p1', rank: 1 },
      { player_id: 'p2', rank: 2 },
      { player_id: 'p3', rank: 3 },
      { player_id: 'p4', rank: 4 },
    ];

    const result = simulateLadderUpdate(ranks, 'p4', 'p1');

    const sortedRanks = result.map(r => r.rank).sort((a, b) => a - b);
    expect(sortedRanks).toEqual([1, 2, 3, 4]);
  });
});

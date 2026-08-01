import {
  calculatePlayerMetrics,
  calculateTotalXp,
  calculateTravellerProgression,
  findCompletedAchievementIds,
  type PlayerMetrics,
} from './progression';

describe('achievement progression', () => {
  describe('calculatePlayerMetrics', () => {
    it('returns zero metrics when there are no matches', () => {
      expect(calculatePlayerMetrics([])).toEqual({
        games: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        kills: 0,
        maxWinStreak: 0,
      });
    });

    it('calculates results, kills, and maximum win streak', () => {
      const matches = [
        { result: 'WIN', kills: 2 },
        { result: 'WIN', kills: 1 },
        { result: 'LOSS', kills: 0 },
        { result: 'WIN', kills: 3 },
        { result: 'WIN', kills: null },
        { result: 'WIN', kills: 1 },
        { result: 'DRAW', kills: 0 },
      ] as const;

      expect(calculatePlayerMetrics(matches)).toEqual({
        games: 7,
        wins: 5,
        losses: 1,
        draws: 1,
        kills: 7,
        maxWinStreak: 3,
      });
    });

    it('treats null and negative kills as zero', () => {
      const matches = [
        { result: 'LOSS', kills: null },
        { result: 'DRAW', kills: -2 },
      ] as const;

      expect(calculatePlayerMetrics(matches).kills).toBe(0);
    });
  });

  describe('calculateTotalXp', () => {
    it('awards participation, result, and kill XP', () => {
      const matches = [
        { result: 'WIN', kills: 2 },
        { result: 'DRAW', kills: 1 },
        { result: 'LOSS', kills: 0 },
      ] as const;

      /*
       * Win:  10 participation + 20 victory + 10 kills = 40
       * Draw: 10 participation +  5 draw    +  5 kills = 20
       * Loss: 10 participation                         = 10
       */
      expect(calculateTotalXp(matches)).toBe(70);
    });

    it('caps kill XP at three kills per match', () => {
      const matches = [{ result: 'LOSS', kills: 10 }] as const;

      // 10 participation + (3 capped kills × 5 XP)
      expect(calculateTotalXp(matches)).toBe(25);
    });

    it('returns zero XP when there are no matches', () => {
      expect(calculateTotalXp([])).toBe(0);
    });
  });

  describe('calculateTravellerProgression', () => {
    it('starts a new player at level 1', () => {
      expect(calculateTravellerProgression([])).toEqual({
        level: 1,
        title: 'Stranded Earthling',
        totalXp: 0,
        currentLevelXp: 0,
        levelXpRequired: 50,
        xpToNextLevel: 50,
        progressPercent: 0,
      });
    });

    it('moves to level 2 at exactly 50 XP', () => {
      const matches = [
        { result: 'WIN', kills: 2 }, // 40 XP
        { result: 'LOSS', kills: 0 }, // 10 XP
      ] as const;

      expect(calculateTravellerProgression(matches)).toEqual({
        level: 2,
        title: 'Mostly Harmless Traveller',
        totalXp: 50,
        currentLevelXp: 0,
        levelXpRequired: 70,
        xpToNextLevel: 70,
        progressPercent: 0,
      });
    });

    it('calculates progress within the current level', () => {
      const matches = [
        { result: 'WIN', kills: 2 }, // 40 XP
        { result: 'WIN', kills: 1 }, // 35 XP
        { result: 'WIN', kills: 0 }, // 30 XP
      ] as const;

      expect(calculateTravellerProgression(matches)).toEqual({
        level: 2,
        title: 'Mostly Harmless Traveller',
        totalXp: 105,
        currentLevelXp: 55,
        levelXpRequired: 70,
        xpToNextLevel: 15,
        progressPercent: 78.6,
      });
    });

    it('returns completed progression at the maximum level', () => {
      const matches = Array.from({ length: 24 }, () => ({
        result: 'WIN' as const,
        kills: 3,
      }));

      // Each match gives 45 XP, producing 1080 XP.
      expect(calculateTravellerProgression(matches)).toEqual({
        level: 8,
        title: 'Ultimate Traveller',
        totalXp: 1080,
        currentLevelXp: 30,
        levelXpRequired: null,
        xpToNextLevel: null,
        progressPercent: 100,
      });
    });
  });

  describe('findCompletedAchievementIds', () => {
    it('returns only achievements whose targets have been reached', () => {
      const metrics: PlayerMetrics = {
        games: 10,
        wins: 2,
        losses: 7,
        draws: 1,
        kills: 12,
        maxWinStreak: 2,
      };

      expect(findCompletedAchievementIds(metrics)).toEqual([
        'first_match',
        'first_win',
        'games_10',
      ]);
    });

    it('returns all six achievements when all targets are reached', () => {
      const metrics: PlayerMetrics = {
        games: 20,
        wins: 10,
        losses: 10,
        draws: 0,
        kills: 42,
        maxWinStreak: 3,
      };

      expect(findCompletedAchievementIds(metrics)).toEqual([
        'first_match',
        'first_win',
        'games_10',
        'wins_10',
        'kills_42',
        'win_streak_3',
      ]);
    });

    it('returns no achievements for a new player', () => {
      const metrics: PlayerMetrics = {
        games: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        kills: 0,
        maxWinStreak: 0,
      };

      expect(findCompletedAchievementIds(metrics)).toEqual([]);
    });
  });
});

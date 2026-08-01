import {
  ACHIEVEMENT_DEFINITIONS,
  type AchievementId,
} from './achievements-definitions';

export type StoredMatchResult = 'WIN' | 'LOSS' | 'DRAW';

export interface MatchProgressRecord {
  result: StoredMatchResult;
  kills: number | null;
}

export interface PlayerMetrics {
  games: number;
  wins: number;
  losses: number;
  draws: number;
  kills: number;
  maxWinStreak: number;
}

export interface TravellerLevelDefinition {
  level: number;
  title: string;
  requiredXp: number;
}

export interface TravellerProgression {
  level: number;
  title: string;
  totalXp: number;
  currentLevelXp: number;
  levelXpRequired: number | null;
  xpToNextLevel: number | null;
  progressPercent: number;
}

export const TRAVELLER_LEVELS = [
  {
    level: 1,
    title: 'Stranded Earthling',
    requiredXp: 0,
  },
  {
    level: 2,
    title: 'Mostly Harmless Traveller',
    requiredXp: 50,
  },
  {
    level: 3,
    title: 'Prepared Hitchhiker',
    requiredXp: 120,
  },
  {
    level: 4,
    title: 'Galactic Wanderer',
    requiredXp: 220,
  },
  {
    level: 5,
    title: 'Guide Contributor',
    requiredXp: 350,
  },
  {
    level: 6,
    title: 'Improbability Specialist',
    requiredXp: 520,
  },
  {
    level: 7,
    title: 'Galactic Veteran',
    requiredXp: 750,
  },
  {
    level: 8,
    title: 'Ultimate Traveller',
    requiredXp: 1050,
  },
] as const satisfies readonly TravellerLevelDefinition[];

export function calculatePlayerMetrics(
  matches: readonly MatchProgressRecord[],
): PlayerMetrics {
  let wins = 0;
  let losses = 0;
  let draws = 0;
  let kills = 0;
  let currentWinStreak = 0;
  let maxWinStreak = 0;

  for (const match of matches) {
    kills += Math.max(0, match.kills ?? 0);

    switch (match.result) {
      case 'WIN':
        wins += 1;
        currentWinStreak += 1;
        maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
        break;

      case 'LOSS':
        losses += 1;
        currentWinStreak = 0;
        break;

      case 'DRAW':
        draws += 1;
        currentWinStreak = 0;
        break;
    }
  }

  return {
    games: matches.length,
    wins,
    losses,
    draws,
    kills,
    maxWinStreak,
  };
}

export function calculateTotalXp(
  matches: readonly MatchProgressRecord[],
): number {
  return matches.reduce((totalXp, match) => {
    const participationXp = 10;
    const resultXp =
      match.result === 'WIN' ? 20 : match.result === 'DRAW' ? 5 : 0;
    const validKills = Math.max(0, match.kills ?? 0);
    const killXp = Math.min(validKills, 3) * 5;

    return totalXp + participationXp + resultXp + killXp;
  }, 0);
}

export function calculateTravellerProgression(
  matches: readonly MatchProgressRecord[],
): TravellerProgression {
  const totalXp = calculateTotalXp(matches);

  let currentLevel: TravellerLevelDefinition = TRAVELLER_LEVELS[0];

  for (const level of TRAVELLER_LEVELS) {
    if (totalXp < level.requiredXp) break;
    currentLevel = level;
  }
  const nextLevel = TRAVELLER_LEVELS.find(
    (level) => level.level === currentLevel.level + 1,
  );

  if (!nextLevel) {
    return {
      level: currentLevel.level,
      title: currentLevel.title,
      totalXp,
      currentLevelXp: totalXp - currentLevel.requiredXp,
      levelXpRequired: null,
      xpToNextLevel: null,
      progressPercent: 100,
    };
  }

  const currentLevelXp = totalXp - currentLevel.requiredXp;
  const levelXpRequired = nextLevel.requiredXp - currentLevel.requiredXp;
  const xpToNextLevel = nextLevel.requiredXp - totalXp;
  const progressPercent = Number(
    ((currentLevelXp / levelXpRequired) * 100).toFixed(1),
  );

  return {
    level: currentLevel.level,
    title: currentLevel.title,
    totalXp,
    currentLevelXp,
    levelXpRequired,
    xpToNextLevel,
    progressPercent,
  };
}

export function findCompletedAchievementIds(
  metrics: PlayerMetrics,
): AchievementId[] {
  return ACHIEVEMENT_DEFINITIONS.filter(
    (achievement) => metrics[achievement.metric] >= achievement.target,
  ).map((achievement) => achievement.id);
}

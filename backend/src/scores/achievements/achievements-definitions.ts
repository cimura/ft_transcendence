export const ACHIEVEMENT_METRICS = [
  'games',
  'wins',
  'kills',
  'maxWinStreak',
] as const;

export type AchievementMetric = (typeof ACHIEVEMENT_METRICS)[number];

export type AchievementCategory = 'JOURNEY' | 'VICTORY' | 'COMBAT';

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  metric: AchievementMetric;
  target: number;
}

export const ACHIEVEMENT_DEFINITIONS = [
  {
    id: 'first_match',
    name: 'Mostly Harmless',
    description: '初めての戦いを完了する',
    icon: 'planet',
    category: 'JOURNEY',
    metric: 'games',
    target: 1,
  },
  {
    id: 'first_win',
    name: "Don't Panic",
    description: '初めての勝利を達成する',
    icon: 'towel',
    category: 'VICTORY',
    metric: 'wins',
    target: 1,
  },
  {
    id: 'games_10',
    name: 'Experienced Hitchhiker',
    description: '10試合を完了する',
    icon: 'thumb',
    category: 'JOURNEY',
    metric: 'games',
    target: 10,
  },
  {
    id: 'wins_10',
    name: 'Sector Champion',
    description: '累計🔟勝を達成する',
    icon: 'trophy',
    category: 'VICTORY',
    metric: 'wins',
    target: 10,
  },
  {
    id: 'kills_42',
    name: 'The Answer',
    description: '累計42キルを達成する',
    icon: 'answer-42',
    category: 'COMBAT',
    metric: 'kills',
    target: 42,
  },
  {
    id: 'win_streak_3',
    name: 'Improbability Survivor',
    description: '3連勝を達成する',
    icon: 'flame',
    category: 'VICTORY',
    metric: 'maxWinStreak',
    target: 3,
  },
] as const satisfies readonly AchievementDefinition[];

export type AchievementId = (typeof ACHIEVEMENT_DEFINITIONS)[number]['id'];

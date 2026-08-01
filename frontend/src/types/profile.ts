/**
 * Profile related type definitions
 */

export interface UserStats {
  totalGames: number
  wins: number
  losses: number
  draws: number
  kills: number
  winRate: number
  maxWinStreak: number
}

export interface MatchHistory {
  id: string
  result: 'win' | 'loss' | 'draw'
  opponents: string[]
  kills?: number
  playedAt: string
  gameType: string
}

export interface RankingItem {
  userId: string
  username: string
  avatarUrl: string | null
  rank: number
  totalGames: number
  wins: number
  losses: number
  draws: number
  kills: number
  points: number
  winRate: number
}

export interface UpdateProfileDto {
  username: string
}

export interface UploadAvatarDto {
  file: File
}

export interface PaginatedResponse<T> {
  data: T[]
  hasMore: boolean
  total: number
  page: number
}

export type MatchHistoryResponse = PaginatedResponse<MatchHistory>

export interface RankingsResponse {
  data: RankingItem[]
}

export type AchievementCategory = 'JOURNEY' | 'VICTORY' | 'COMBAT'

export interface TravellerProgression {
  level: number
  title: string
  totalXp: number
  currentLevelXp: number
  levelXpRequired: number | null
  xpToNextLevel: number | null
  progressPercent: number
}

export interface AchievementProgress {
  id: string
  name: string
  description: string
  icon: string
  category: AchievementCategory
  progress: number
  target: number
  unlocked: boolean
  unlockedAt: string | null
}

export interface GalacticGuide {
  progression: TravellerProgression
  unlockedCount: number
  totalCount: number
  achievements: AchievementProgress[]
}

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
  maxWinStreak?: number
}

export interface MatchHistory {
  id: string
  result: 'win' | 'loss' | 'draw'
  opponents: string[]
  kills: number
  playedAt: Date
  gameType: string
}

export interface UpdateProfileDto {
  displayName?: string
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

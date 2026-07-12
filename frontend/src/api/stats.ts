import api from './client'

import type {
  UserStats,
  MatchHistoryResponse,
  RankingsResponse,
} from '../types/profile'

/**
 * モック統計データ
 */
const mockStats: Record<string, UserStats> = {
  'current-user-id': {
    totalGames: 42,
    wins: 28,
    losses: 12,
    draws: 2,
    kills: 156,
    winRate: 66.67,
    maxWinStreak: 7,
  },
  'user-1': {
    totalGames: 35,
    wins: 20,
    losses: 15,
    draws: 0,
    kills: 98,
    winRate: 57.14,
    maxWinStreak: 5,
  },
  'user-2': {
    totalGames: 18,
    wins: 10,
    losses: 7,
    draws: 1,
    kills: 45,
    winRate: 55.56,
    maxWinStreak: 3,
  },
  'user-3': {
    totalGames: 50,
    wins: 35,
    losses: 12,
    draws: 3,
    kills: 210,
    winRate: 70.0,
    maxWinStreak: 12,
  },
}

/**
 * Get user statistics
 * @param userId User ID
 * @returns Promise<UserStats> User statistics data
 */
export const getUserStats = async (userId: string): Promise<UserStats> => {
  // モックデータを返す
  return new Promise((resolve) => {
    setTimeout(() => {
      const stats = mockStats[userId]
      if (stats) {
        resolve(stats)
      } else {
        // デフォルト統計を返す
        resolve({
          totalGames: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          kills: 0,
          winRate: 0,
          maxWinStreak: 0,
        })
      }
    }, 400)
  })

  // 実際のAPI実装時はこちらを使用
  // const response = await api.get<UserStats>(`/api/scores/user/${userId}/stats`)
  // return response.data
}

/**
 * Get match history with pagination
 * @param userId User ID
 * @param page Page number (1-indexed)
 * @param limit Items per page
 * @returns Promise<MatchHistoryResponse> Paginated match history
 */
export const getMatchHistory = async (
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<MatchHistoryResponse> => {
  const response = await api.get<MatchHistoryResponse>(
    `/scores/user/${userId}`,
    {
      params: { page, limit },
    }
  )
  return response.data
}

export const getRankings = async (
  limit: number = 20
): Promise<RankingsResponse> => {
  const response = await api.get<RankingsResponse>('/scores/rankings', {
    params: { limit },
  })
  return response.data
}

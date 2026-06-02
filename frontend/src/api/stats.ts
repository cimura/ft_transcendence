import type {
  UserStats,
  MatchHistory,
  MatchHistoryResponse,
} from '../types/profile'

/**
 * TODO: 実際のAPI実装時は以下のaxiosインスタンスを使用
 *
 * import axios from 'axios'
 *
 * const api = axios.create({
 *   baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
 *   withCredentials: true,
 * })
 */

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
 * モック試合履歴データ生成
 */
const generateMockHistory = (
  userId: string,
  count: number,
  offset: number
): MatchHistory[] => {
  const results: Array<'win' | 'loss' | 'draw'> = ['win', 'loss', 'draw']
  const gameTypes = [
    'Battle Royale',
    'Team Deathmatch',
    'Free For All',
    'Capture the Flag',
  ]
  const opponents = ['alice', 'bob', 'charlie', 'david', 'eve', 'frank']

  return Array.from({ length: count }, (_, i) => {
    const index = offset + i
    return {
      id: `${userId}-match-${index}`,
      result: results[index % 3],
      opponents: opponents.slice(0, Math.floor(Math.random() * 3) + 1),
      kills: Math.floor(Math.random() * 10) + 1,
      playedAt: new Date(Date.now() - index * 3600000 * 2),
      gameType: gameTypes[index % gameTypes.length],
    }
  })
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
  // モックデータを返す
  return new Promise((resolve) => {
    setTimeout(() => {
      const totalMatches = mockStats[userId]?.totalGames || 50
      const offset = (page - 1) * limit
      const data = generateMockHistory(userId, limit, offset)
      const hasMore = offset + limit < totalMatches

      resolve({
        data,
        hasMore,
        total: totalMatches,
        page,
      })
    }, 500)
  })

  // 実際のAPI実装時はこちらを使用
  // const response = await api.get<MatchHistoryResponse>(`/api/scores/user/${userId}`, {
  //   params: { page, limit },
  // })
  // return response.data
}

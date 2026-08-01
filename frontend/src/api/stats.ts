import api from './client'

import type {
  UserStats,
  MatchHistoryResponse,
  RankingsResponse,
  GalacticGuide,
} from '../types/profile'

/**
 * Get user statistics
 * @param userId User ID
 * @returns Promise<UserStats> User statistics data
 */
export const getUserStats = async (userId: string): Promise<UserStats> => {
  const response = await api.get<UserStats>(`/scores/user/${userId}/stats`)
  return response.data
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

/**
 *  Get a user's Traveller progression and achievements.
 */

export const getGalacticGuide = async (
  userId: string
): Promise<GalacticGuide> => {
  const response = await api.get<GalacticGuide>(`/scores/user/${userId}/guide`)

  return response.data
}

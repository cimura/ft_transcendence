import { useState, useEffect } from 'react'
import type { UserStats } from '../types/profile'
import * as statsApi from '../api/stats'

/**
 * Custom hook for fetching user statistics
 * @param userId User ID to fetch stats for
 * @returns Stats data, loading state, and error
 */
export const useStats = (userId: string | undefined) => {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      // userIdが未定義の場合は初期状態にリセット
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStats(null)
      return
    }

    const fetchStats = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await statsApi.getUserStats(userId)
        setStats(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stats')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [userId])

  return { stats, loading, error }
}

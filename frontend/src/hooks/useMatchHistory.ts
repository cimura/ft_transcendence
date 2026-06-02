import { useState, useEffect, useCallback } from 'react'
import type { MatchHistory } from '../types/profile'
import * as statsApi from '../api/stats'

/**
 * Custom hook for fetching match history with infinite scroll
 * @param userId User ID to fetch history for
 * @param limit Items per page
 * @returns Match history data, loading states, and load more function
 */
export const useMatchHistory = (
  userId: string | undefined,
  limit: number = 20
) => {
  const [matches, setMatches] = useState<MatchHistory[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [loadingMore, setLoadingMore] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState<boolean>(true)
  const [page, setPage] = useState<number>(1)

  // 初期データ取得
  useEffect(() => {
    if (!userId) {
      // userIdが未定義の場合は初期状態にリセット
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMatches([])
      setHasMore(true)
      setPage(1)
      return
    }

    const fetchInitialData = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await statsApi.getMatchHistory(userId, 1, limit)
        setMatches(response.data)
        setHasMore(response.hasMore)
        setPage(1)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch match history'
        )
      } finally {
        setLoading(false)
      }
    }

    fetchInitialData()
  }, [userId, limit])

  // 追加データ読み込み
  const loadMore = useCallback(async () => {
    if (!userId || loadingMore || !hasMore) return

    try {
      setLoadingMore(true)
      setError(null)
      const nextPage = page + 1
      const response = await statsApi.getMatchHistory(userId, nextPage, limit)
      setMatches((prev) => [...prev, ...response.data])
      setHasMore(response.hasMore)
      setPage(nextPage)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load more matches'
      )
    } finally {
      setLoadingMore(false)
    }
  }, [userId, page, limit, loadingMore, hasMore])

  return {
    matches,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
  }
}

import { useCallback, useEffect, useState } from 'react'
import { getNotifications } from '../api/notifications'
import type { NotificationItem } from '../types/notification'

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const nextNotifications = await getNotifications()
      setNotifications(nextNotifications)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch notifications'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return {
    notifications,
    loading,
    error,
    refetch,
  }
}

import { useCallback, useEffect, useState } from 'react'
import { getNotifications } from '../api/notifications'
import type { NotificationItem } from '../types/notification'

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
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
    let ignore = false

    getNotifications()
      .then((nextNotifications) => {
        if (ignore) return
        setNotifications(nextNotifications)
        setError(null)
      })
      .catch((err) => {
        if (ignore) return
        setError(
          err instanceof Error ? err.message : 'Failed to fetch notifications'
        )
      })
      .finally(() => {
        if (ignore) return
        setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [])

  return {
    notifications,
    loading,
    error,
    refetch,
  }
}

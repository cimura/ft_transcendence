import { useEffect } from 'react'
import { useNotificationStore } from '../stores/notificationStore'

export function useNotifications() {
  const notifications = useNotificationStore((state) => state.notifications)
  const storeLoading = useNotificationStore((state) => state.loading)
  const loaded = useNotificationStore((state) => state.loaded)
  const error = useNotificationStore((state) => state.error)
  const refetch = useNotificationStore((state) => state.fetchNotifications)
  const removeNotification = useNotificationStore(
    (state) => state.removeNotification
  )
  const ensureNotifications = useNotificationStore(
    (state) => state.ensureNotifications
  )

  useEffect(() => {
    void ensureNotifications()
  }, [ensureNotifications])

  return {
    notifications,
    loading: storeLoading || (!loaded && !error),
    error,
    refetch,
    removeNotification,
  }
}

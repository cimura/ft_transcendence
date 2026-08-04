import { useEffect } from 'react'
import type {
  RealtimeClientToServerEvents,
  RealtimeServerToClientEvents,
} from '@ft_transcendence/shared/realtime-events.types'
import { useAuthStore } from '../stores/authStore'
import { useNotificationStore } from '../stores/notificationStore'
import { useFriendStore } from '../stores/friendStore'
import { createSocket } from '../utils/socket'

export function useRealtimeSocket() {
  const accessToken = useAuthStore((state) => state.accessToken)

  useEffect(() => {
    if (!accessToken) return

    const socket = createSocket<
      RealtimeServerToClientEvents,
      RealtimeClientToServerEvents
    >('/realtime', accessToken, { autoConnect: false })

    const handleConnect = () => {
      void useNotificationStore.getState().fetchNotifications()
      void useFriendStore.getState().fetchFriends()
    }

    const handleNewNotification = (
      notification: Parameters<
        RealtimeServerToClientEvents['notification:new']
      >[0]
    ) => {
      useNotificationStore.getState().addNotification(notification)
    }

    const handlePresenceUpdated = (
      update: Parameters<RealtimeServerToClientEvents['presence:updated']>[0]
    ) => {
      useFriendStore.getState().updateFriendStatus(update.userId, update.status)
    }

    socket.on('connect', handleConnect)
    socket.on('notification:new', handleNewNotification)
    socket.on('presence:updated', handlePresenceUpdated)
    socket.on('connect_error', (error: Error) => {
      console.error('[RealtimeSocket] connection error:', error)
    })

    socket.connect()

    return () => {
      socket.off('connect', handleConnect)
      socket.off('notification:new', handleNewNotification)
      socket.off('presence:updated', handlePresenceUpdated)
      socket.disconnect()
    }
  }, [accessToken])
}

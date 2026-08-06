import { useEffect } from 'react'
import type {
  RealtimeClientToServerEvents,
  RealtimeServerToClientEvents,
} from '@ft_transcendence/shared/realtime-events.types'
import { useAuthStore } from '../stores/authStore'
import { useNotificationStore } from '../stores/notificationStore'
import { useFriendStore } from '../stores/friendStore'
import { createSocket, releaseSocket } from '../utils/socket'

export function useRealtimeSocket() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const authStatus = useAuthStore((state) => state.authStatus)

  useEffect(() => {
    if (!accessToken || authStatus !== 'authenticated') return

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

    socket.connect()

    return () => {
      socket.off('connect', handleConnect)
      socket.off('notification:new', handleNewNotification)
      socket.off('presence:updated', handlePresenceUpdated)
      releaseSocket(socket)
    }
  }, [accessToken, authStatus])
}

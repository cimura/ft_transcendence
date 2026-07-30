import { useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import type {
  RealtimeClientToServerEvents,
  RealtimeServerToClientEvents,
} from '@ft_transcendence/shared/realtime-events.types'
import { useAuthStore } from '../stores/authStore'
import { useNotificationStore } from '../stores/notificationStore'
import { useFriendStore } from '../stores/friendStore'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || window.location.origin
const REALTIME_NAMESPACE = `${BACKEND_URL.replace(/\/$/, '')}/realtime`

export function useRealtimeSocket() {
  const accessToken = useAuthStore((state) => state.accessToken)

  useEffect(() => {
    if (!accessToken) return

    const socket: Socket<
      RealtimeServerToClientEvents,
      RealtimeClientToServerEvents
    > = io(REALTIME_NAMESPACE, {
      autoConnect: false,
      auth: { token: `Bearer ${accessToken}` },
    })

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

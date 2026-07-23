import { create } from 'zustand'
import { getNotifications } from '../api/notifications'
import type { NotificationItem } from '../types/notification'
import type { RealtimeNotification } from '@ft_transcendence/shared/realtime-events.types'

interface NotificationStore {
  notifications: NotificationItem[]
  loading: boolean
  loaded: boolean
  error: string | null
  fetchNotifications: () => Promise<void>
  ensureNotifications: () => Promise<void>
  removeNotification: (notificationId: string) => void
  addNotification: (notification: RealtimeNotification) => void
}

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Failed to fetch notifications'

const mergeNotifications = (
  base: NotificationItem[],
  additions: NotificationItem[]
) => {
  const byId = new Map(
    base.map((notification) => [notification.id, notification])
  )

  for (const notification of additions) {
    byId.set(notification.id, notification)
  }

  return [...byId.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  loading: false,
  loaded: false,
  error: null,

  fetchNotifications: async () => {
    try {
      set({ loading: true, error: null })
      const notifications = await getNotifications()
      set((state) => ({
        // 通知ソケットがfetch中に受信した通知を失わないように統合する。
        notifications: mergeNotifications(notifications, state.notifications),
        loading: false,
        loaded: true,
      }))
    } catch (error) {
      set({
        error: toErrorMessage(error),
        loading: false,
        loaded: false,
      })
    }
  },

  ensureNotifications: async () => {
    const { loaded, loading, fetchNotifications } = get()
    if (loaded || loading) return
    await fetchNotifications()
  },

  removeNotification: (notificationId) =>
    set((state) => ({
      notifications: state.notifications.filter(
        (notification) => notification.id !== notificationId
      ),
    })),

  addNotification: (notification) =>
    set((state) => {
      if (state.notifications.some((item) => item.id === notification.id)) {
        return state
      }

      return {
        notifications: mergeNotifications(state.notifications, [notification]),
        loaded: true,
      }
    }),
}))

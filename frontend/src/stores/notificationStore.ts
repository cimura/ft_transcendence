import { create } from 'zustand'
import { getNotifications } from '../api/notifications'
import type { NotificationItem } from '../types/notification'

interface NotificationStore {
  notifications: NotificationItem[]
  loading: boolean
  loaded: boolean
  error: string | null
  fetchNotifications: () => Promise<void>
  ensureNotifications: () => Promise<void>
  removeNotification: (notificationId: string) => void
}

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Failed to fetch notifications'

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  loading: false,
  loaded: false,
  error: null,

  fetchNotifications: async () => {
    try {
      set({ loading: true, error: null })
      const notifications = await getNotifications()
      set({ notifications, loading: false, loaded: true })
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
}))

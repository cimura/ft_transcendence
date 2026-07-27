import { create } from 'zustand'
import { getNotifications } from '../api/notifications'
import { getApiErrorMessage } from '../api/errors'
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
  getApiErrorMessage(error, '通知の取得に失敗しました。')

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
      // fetch開始前に存在していた通知のidを控えておく。
      const knownIdsBeforeFetch = new Set(get().notifications.map((n) => n.id))
      set({ loading: true, error: null })
      const notifications = await getNotifications()
      set((state) => {
        // fetch中にソケットで新着した通知（fetch開始前には存在しなかったid）のみ保持する。
        // fetch開始前から存在した通知はサーバの結果を正とし、
        // サーバ側で削除された通知（承認・拒否済みのフレンド申請など）を再投入しない。
        const socketArrivals = state.notifications.filter(
          (n) => !knownIdsBeforeFetch.has(n.id)
        )
        return {
          notifications: mergeNotifications(notifications, socketArrivals),
          loading: false,
          loaded: true,
        }
      })
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

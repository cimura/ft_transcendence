import { create } from 'zustand'
import type { Friend } from '../types/friend'
import * as friendApi from '../api/friend'
import { getApiErrorMessage } from '../api/errors'

interface FriendState {
  friends: Friend[]
  presenceStatuses: Record<string, Friend['status']>
  loading: boolean
  error: string | null

  // Actions - フレンド関連
  setFriends: (friends: Friend[]) => void
  updateFriendStatus: (friendId: string, status: Friend['status']) => void
  removeFriend: (friendId: string) => void

  // Actions - API呼び出し
  fetchFriends: () => Promise<void>
  sendRequest: (userId: string) => Promise<void>
  deleteFriend: (friendId: string) => Promise<void>
}

/**
 * Friend store
 * Manages friends, loading, and error states
 */
export const useFriendStore = create<FriendState>((set, get) => ({
  // Initial state
  friends: [],
  presenceStatuses: {},
  loading: false,
  error: null,

  // フレンド関連のアクション
  setFriends: (friends) =>
    set((state) => ({
      friends: friends.map((friend) => ({
        ...friend,
        status: state.presenceStatuses[friend.id] ?? friend.status,
      })),
    })),

  updateFriendStatus: (friendId, status) =>
    set((state) => ({
      presenceStatuses: {
        ...state.presenceStatuses,
        [friendId]: status,
      },
      friends: state.friends.map((friend) =>
        friend.id === friendId ? { ...friend, status } : friend
      ),
    })),

  removeFriend: (friendId) =>
    set((state) => {
      const presenceStatuses = { ...state.presenceStatuses }
      delete presenceStatuses[friendId]
      return {
        friends: state.friends.filter((f) => f.id !== friendId),
        presenceStatuses,
      }
    }),

  // API呼び出しアクション
  fetchFriends: async () => {
    try {
      set({ loading: true, error: null })
      const friends = await friendApi.getFriends()
      get().setFriends(friends)
      set({ loading: false })
    } catch (error) {
      set({
        error: getApiErrorMessage(error, 'フレンド一覧の取得に失敗しました。'),
        loading: false,
      })
    }
  },

  sendRequest: async (userId) => {
    try {
      set({ loading: true, error: null })
      await friendApi.sendFriendRequest(userId)
      set({ loading: false })
    } catch (error) {
      set({
        error: getApiErrorMessage(
          error,
          'フレンドリクエストの送信に失敗しました。'
        ),
        loading: false,
      })
      throw error
    }
  },

  deleteFriend: async (friendId) => {
    try {
      set({ loading: true, error: null })
      await friendApi.deleteFriend(friendId)

      // フレンドを削除
      const { removeFriend } = get()
      removeFriend(friendId)

      set({ loading: false })
    } catch (error) {
      set({
        error: getApiErrorMessage(error, 'フレンドの削除に失敗しました。'),
        loading: false,
      })
      throw error
    }
  },
}))

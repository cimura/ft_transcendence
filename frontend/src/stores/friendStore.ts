import { create } from 'zustand'
import type { Friend, FriendRequest } from '../types/friend'
import * as friendApi from '../api/friend'
import { getApiErrorMessage } from '../api/errors'

interface FriendState {
  friends: Friend[]
  requests: FriendRequest[]
  loading: boolean
  error: string | null

  // Actions - フレンド関連
  setFriends: (friends: Friend[]) => void
  updateFriendStatus: (friendId: string, status: Friend['status']) => void
  addFriend: (friend: Friend) => void
  removeFriend: (friendId: string) => void

  // Actions - リクエスト関連
  setRequests: (requests: FriendRequest[]) => void
  addRequest: (request: FriendRequest) => void
  removeRequest: (requestId: string) => void

  // Actions - ローディング・エラー
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // Actions - API呼び出し
  fetchFriends: () => Promise<void>
  fetchRequests: () => Promise<void>
  sendRequest: (userId: string) => Promise<void>
  acceptRequest: (requestId: string) => Promise<void>
  rejectRequest: (requestId: string) => Promise<void>
  deleteFriend: (friendId: string) => Promise<void>
}

/**
 * Friend store
 * Manages friends, friend requests, loading, and error states
 */
export const useFriendStore = create<FriendState>((set, get) => ({
  // Initial state
  friends: [],
  requests: [],
  loading: false,
  error: null,

  // フレンド関連のアクション
  setFriends: (friends) => set({ friends }),

  updateFriendStatus: (friendId, status) =>
    set((state) => ({
      friends: state.friends.map((friend) =>
        friend.id === friendId ? { ...friend, status } : friend
      ),
    })),

  addFriend: (friend) =>
    set((state) => ({
      friends: [...state.friends, friend],
    })),

  removeFriend: (friendId) =>
    set((state) => ({
      friends: state.friends.filter((f) => f.id !== friendId),
    })),

  // リクエスト関連のアクション
  setRequests: (requests) => set({ requests }),

  addRequest: (request) =>
    set((state) => ({
      requests: [...state.requests, request],
    })),

  removeRequest: (requestId) =>
    set((state) => ({
      requests: state.requests.filter((r) => r.id !== requestId),
    })),

  // ローディング・エラー
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // API呼び出しアクション
  fetchFriends: async () => {
    try {
      set({ loading: true, error: null })
      const friends = await friendApi.getFriends()
      set({ friends, loading: false })
    } catch (error) {
      set({
        error: getApiErrorMessage(error, 'フレンド一覧の取得に失敗しました。'),
        loading: false,
      })
    }
  },

  fetchRequests: async () => {
    try {
      set({ loading: true, error: null })
      const requests = await friendApi.getFriendRequests()
      set({ requests, loading: false })
    } catch (error) {
      set({
        error: getApiErrorMessage(
          error,
          'フレンドリクエストの取得に失敗しました。'
        ),
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

  acceptRequest: async (requestId) => {
    try {
      set({ loading: true, error: null })
      await friendApi.acceptFriendRequest(requestId)

      // リクエストを削除
      const { removeRequest } = get()
      removeRequest(requestId)

      // フレンド一覧を再取得
      await get().fetchFriends()

      set({ loading: false })
    } catch (error) {
      set({
        error: getApiErrorMessage(
          error,
          'フレンドリクエストの承認に失敗しました。'
        ),
        loading: false,
      })
      throw error
    }
  },

  rejectRequest: async (requestId) => {
    try {
      set({ loading: true, error: null })
      await friendApi.rejectFriendRequest(requestId)

      // リクエストを削除
      const { removeRequest } = get()
      removeRequest(requestId)

      set({ loading: false })
    } catch (error) {
      set({
        error: getApiErrorMessage(
          error,
          'フレンドリクエストの拒否に失敗しました。'
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

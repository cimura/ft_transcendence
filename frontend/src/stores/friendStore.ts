import { create } from 'zustand'
import type { Friend, FriendRequest } from '../types/friend'
import * as friendApi from '../api/friend'

interface FriendState {
  friends: Friend[]
  requests: FriendRequest[]
  loading: boolean
  error: string | null

  // Actions - フレンド関連
  setFriends: (friends: Friend[]) => void
  addFriend: (friend: Friend) => void
  removeFriend: (friendId: string) => void
  updateFriendStatus: (userId: string, status: Friend['status']) => void

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

  addFriend: (friend) =>
    set((state) => ({
      friends: [...state.friends, friend],
    })),

  removeFriend: (friendId) =>
    set((state) => ({
      friends: state.friends.filter((f) => f.id !== friendId),
    })),

  updateFriendStatus: (userId, status) =>
    set((state) => ({
      friends: state.friends.map((f) =>
        f.id === userId ? { ...f, status, isOnline: status !== 'offline' } : f
      ),
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
        error:
          error instanceof Error ? error.message : 'Failed to fetch friends',
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
        error:
          error instanceof Error ? error.message : 'Failed to fetch requests',
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
        error:
          error instanceof Error ? error.message : 'Failed to send request',
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
        error:
          error instanceof Error ? error.message : 'Failed to accept request',
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
        error:
          error instanceof Error ? error.message : 'Failed to reject request',
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
        error:
          error instanceof Error ? error.message : 'Failed to delete friend',
        loading: false,
      })
      throw error
    }
  },
}))

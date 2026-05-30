import { create } from 'zustand'
import type { User } from '../types/user'
import * as authApi from '../api/auth'

interface AuthState {
  currentUser: User | null
  loading: boolean
  error: string | null

  // Actions
  setCurrentUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // API呼び出し
  fetchCurrentUser: () => Promise<void>
  logout: () => Promise<void>
}

/**
 * Auth store
 * Manages current user authentication state
 */
export const useAuthStore = create<AuthState>((set) => ({
  // Initial state
  currentUser: null,
  loading: false,
  error: null,

  // Actions
  setCurrentUser: (user) => set({ currentUser: user }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // API呼び出しアクション
  fetchCurrentUser: async () => {
    try {
      set({ loading: true, error: null })
      const user = await authApi.getCurrentUser()
      set({ currentUser: user, loading: false })
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch current user',
        loading: false,
      })
    }
  },

  logout: async () => {
    try {
      set({ loading: true, error: null })
      await authApi.logout()
      set({ currentUser: null, loading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to logout',
        loading: false,
      })
      throw error
    }
  },
}))

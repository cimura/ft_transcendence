import { create } from 'zustand'
import type { User } from '../types/user'
import * as authApi from '../api/auth'

interface AuthState {
  currentUser: User | null
  accessToken: string | null
  loading: boolean
  error: string | null

  // Actions
  setCurrentUser: (user: User | null) => void
  setAccessToken: (token: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // API呼び出し
  signIn: (email: string, password: string) => Promise<void>
  fetchCurrentUser: () => Promise<void>
  logout: () => Promise<void>
}

const ACCESS_TOKEN_KEY = 'accessToken'

const getStoredAccessToken = () => {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(ACCESS_TOKEN_KEY)
}

const storeAccessToken = (token: string | null) => {
  if (typeof window === 'undefined') return

  if (token) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token)
    return
  }

  window.localStorage.removeItem(ACCESS_TOKEN_KEY)
}

/**
 * Auth store
 * Manages current user authentication state
 */
export const useAuthStore = create<AuthState>((set) => ({
  // Initial state
  currentUser: null,
  accessToken: getStoredAccessToken(),
  loading: false,
  error: null,

  // Actions
  setCurrentUser: (user) => set({ currentUser: user }),
  setAccessToken: (token) => {
    storeAccessToken(token)
    set({ accessToken: token })
  },
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // API呼び出しアクション
  signIn: async (email, password) => {
    try {
      set({ loading: true, error: null })
      const { accessToken } = await authApi.signIn({ email, password })
      storeAccessToken(accessToken)
      const user = await authApi.getCurrentUser()
      set({ accessToken, currentUser: user, loading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to sign in',
        loading: false,
      })
      throw error
    }
  },

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
      storeAccessToken(null)
      set({ currentUser: null, accessToken: null, loading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to logout',
        loading: false,
      })
      throw error
    }
  },
}))

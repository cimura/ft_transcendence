import { create } from 'zustand'
import axios from 'axios'
import type { User } from '../types/user'
import * as authApi from '../api/auth'
import { getApiErrorMessage } from '../api/errors'
import {
  getStoredAccessToken,
  storeAccessToken,
} from '../utils/accessToken'

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

  fetchCurrentUser: async () => {
    try {
      set({ loading: true, error: null })
      const user = await authApi.getCurrentUser()
      set({ currentUser: user, loading: false })
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        storeAccessToken(null)
        set({
          currentUser: null,
          accessToken: null,
          error:
            'セッションの有効期限が切れました。もう一度ログインしてください。',
          loading: false,
        })
        return
      }

      set({
        error: getApiErrorMessage(
          error,
          'アカウント情報の取得に失敗しました。'
        ),
        loading: false,
      })
    }
  },

  logout: async () => {
    let logoutError: unknown = null

    try {
      set({ loading: true, error: null })
      await authApi.logout()
    } catch (error) {
      logoutError = error
      set({
        error: getApiErrorMessage(error, 'ログアウトに失敗しました。'),
      })
    } finally {
      storeAccessToken(null)
      set({ currentUser: null, accessToken: null, loading: false })
    }

    if (logoutError) {
      throw logoutError
    }
  },
}))

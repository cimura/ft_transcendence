import { create } from 'zustand'
import type { User } from '../types/user'
import * as authApi from '../api/auth'
import { getApiErrorMessage } from '../api/errors'
import { isSessionExpiredError, setSessionExpiredHandler } from '../api/session'
import { getStoredAccessToken, storeAccessToken } from '../utils/accessToken'

/**
 * - checking: 起動時（または新規サインイン直後）、トークンの有効性をバックエンドに確認している間
 * - authenticated: ログイン済み(トークン有効)。この状態では currentUser が必ず存在する。
 * - verification-failed: トークンは有効かもしれないが、通信障害等でユーザー情報を取得できなかった
 * - unauthenticated: 未ログイン、またはトークンが無効と判明した
 */
export type AuthStatus =
  | 'checking'
  | 'authenticated'
  | 'verification-failed'
  | 'unauthenticated'

interface AuthState {
  currentUser: User | null
  accessToken: string | null
  authStatus: AuthStatus
  loading: boolean
  error: string | null

  // Actions
  setCurrentUser: (user: User | null) => void
  setAccessToken: (token: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  fetchCurrentUser: () => Promise<void>
  logout: () => Promise<void>
  /** トークンが無効だと判明したときに呼ぶ。メッセージは出さず静かにサインアウトする。 */
  forceSignOut: () => void
  /** トークンの有効性を GET /users/profile でバックエンドに確認する。401なら interceptor が forceSignOut する。 */
  verifySession: () => Promise<void>
}

const initialAccessToken = getStoredAccessToken()

export const useAuthStore = create<AuthState>((set) => ({
  // Initial state
  currentUser: null,
  accessToken: initialAccessToken,
  authStatus: initialAccessToken ? 'checking' : 'unauthenticated',
  loading: false,
  error: null,

  // Actions
  setCurrentUser: (user) => set({ currentUser: user }),
  setAccessToken: (token) => {
    storeAccessToken(token)
    // サインイン/サインアップ直後も、トークンをそのまま信頼せず
    // 'checking' を経由させる。これによりゲート(App.tsx)側で
    // verifySession() が走り、currentUser が埋まってから画面が描画される。
    set({
      accessToken: token,
      authStatus: token ? 'checking' : 'unauthenticated',
    })
  },
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  forceSignOut: () => {
    storeAccessToken(null)
    set({
      currentUser: null,
      accessToken: null,
      authStatus: 'unauthenticated',
      error: null,
      loading: false,
    })
  },

  verifySession: async () => {
    const token = getStoredAccessToken()
    if (!token) {
      set({
        currentUser: null,
        accessToken: null,
        authStatus: 'unauthenticated',
      })
      return
    }

    try {
      const user = await authApi.getCurrentUser()
      // 検証中に logout/forceSignOut/再サインインでトークンが変わっていたら、
      // この応答はもう最新ではないので状態を上書きしない
      if (getStoredAccessToken() !== token) return
      set({ currentUser: user, authStatus: 'authenticated', error: null })
    } catch (error) {
      // トークンが無効なら 401 が返り、interceptor が先に forceSignOut 済み。
      // 何もせず終える(無言でSignInへ)。
      if (isSessionExpiredError(error)) return

      if (getStoredAccessToken() !== token) return

      // ネットワーク障害など、トークンの正当性とは無関係な失敗ではサインアウトさせない。
      // ただし currentUser が無いまま authenticated にはしない
      // (App.tsx のゲートが再試行画面を描画する)。
      set({
        authStatus: 'verification-failed',
        error: getApiErrorMessage(
          error,
          'アカウント情報の取得に失敗しました。'
        ),
      })
    }
  },

  fetchCurrentUser: async () => {
    try {
      set({ loading: true, error: null })
      const user = await authApi.getCurrentUser()
      set({ currentUser: user, loading: false })
    } catch (error) {
      if (isSessionExpiredError(error)) {
        set({ loading: false })
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
      if (!isSessionExpiredError(error)) {
        logoutError = error
        set({
          error: getApiErrorMessage(error, 'ログアウトに失敗しました。'),
        })
      }
    } finally {
      storeAccessToken(null)
      set({
        currentUser: null,
        accessToken: null,
        authStatus: 'unauthenticated',
        loading: false,
      })
    }

    if (logoutError) {
      throw logoutError
    }
  },
}))

setSessionExpiredHandler(() => useAuthStore.getState().forceSignOut())

/**
 * 認証ゲート(App.tsx)が currentUser の存在を保証した保護ルート配下でのみ使う。
 * ゲートを通っていれば throw されないため、呼び出し側は null 分岐が不要になる。
 */
export const useCurrentUser = (): User => {
  const currentUser = useAuthStore((state) => state.currentUser)
  if (!currentUser) {
    throw new Error('useCurrentUser must be used inside authenticated routes')
  }
  return currentUser
}

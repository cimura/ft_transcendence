import api from './client'
import axios from 'axios'
import type { LoginCredentials, User } from '../types/user'

export type AuthErrorType =
  | 'INVALID_CREDENTIALS' // ログイン失敗（401）
  | 'CONFLICT' // 重複エラー（409）
  | 'BAD_REQUEST' // バリデーションエラー（400）
  | 'NETWORK_ERROR' // サーバーダウンなど
  | 'UNKNOWN'

export class AuthApiError extends Error {
  public type: AuthErrorType
  public fields: ('email' | 'username')[]

  constructor(
    type: AuthErrorType,
    message: string,
    fields: ('email' | 'username')[] = []
  ) {
    super(message)
    this.name = 'AuthApiError'

    this.type = type
    this.fields = fields

    Object.setPrototypeOf(this, AuthApiError.prototype)
  }
}

interface BackendConflictResponse {
  fields: ('email' | 'username')[]
}

export const signUpApi = async (data: {
  email: string
  username: string
  password: string
}) => {
  try {
    const response = await api.post<{ id: string; accessToken: string }>(
      '/auth/signup',
      data
    )
    return response.data
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 409) {
        const backendData = err.response.data as BackendConflictResponse
        throw new AuthApiError(
          'CONFLICT',
          'メールアドレス、またはユーザー名がすでに存在しています。',
          backendData.fields
        )
      }
      if (err.response?.status === 400) {
        throw new AuthApiError('BAD_REQUEST', '入力フォーマットが不正です。')
      }
      throw new AuthApiError(
        'NETWORK_ERROR',
        'サーバーとの通信に失敗しました。'
      )
    }
    throw new AuthApiError('UNKNOWN', '予期せぬエラーが発生しました。')
  }
}

export const signInApi = async (credentials: LoginCredentials) => {
  try {
    const response = await api.post<{ accessToken: string }>(
      '/auth/signin',
      credentials
    )
    return response.data
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 401) {
        throw new AuthApiError(
          'INVALID_CREDENTIALS',
          'ユーザー名、またはパスワードが正しくありません。'
        )
      }
      if (err.response?.status === 400) {
        throw new AuthApiError('BAD_REQUEST', '入力情報が不足しています。')
      }
      throw new AuthApiError(
        'NETWORK_ERROR',
        'サーバーとの通信に失敗しました。'
      )
    }
    throw new AuthApiError('UNKNOWN', '予期せぬエラーが発生しました。')
  }
}

interface UserResponse {
  id: string
  email: string
  username: string
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
}

interface CurrentUserResponse {
  user: UserResponse
}

const mapToUser = (user: UserResponse): User => ({
  id: user.id,
  email: user.email,
  username: user.username,
  avatarUrl: user.avatarUrl ?? undefined,
  isGuest: false,
  createdAt: new Date(user.createdAt),
  updatedAt: new Date(user.updatedAt),
})

/**
 * Get current logged-in user
 * @returns Promise<User> Current user data
 */
export const getCurrentUser = async (): Promise<User> => {
  const response = await api.get<CurrentUserResponse>('/users/profile')
  return mapToUser(response.data.user)
}

export type SessionResult =
  | { valid: false }
  | { valid: true; user: User; expiresAt: number }

interface SessionResponse {
  valid: boolean
  expiresAt?: string
  user?: UserResponse
}

/**
 * アクセストークンが有効かどうかをバックエンドに確認する。
 * トークンが無効・期限切れ・未送信のいずれでも `GET /auth/session` は
 * 401 ではなく常に 200 を返すため、devtoolsのコンソールにエラーは出ない。
 */
export const getSession = async (): Promise<SessionResult> => {
  const response = await api.get<SessionResponse>('/auth/session')
  const { valid, expiresAt, user } = response.data

  if (!valid || !expiresAt || !user) {
    return { valid: false }
  }

  return {
    valid: true,
    user: mapToUser(user),
    expiresAt: new Date(expiresAt).getTime(),
  }
}

/**
 * Logout current user
 * @returns Promise<void>
 */
export const logout = async (): Promise<void> => {
  await api.post('/auth/logout')
}

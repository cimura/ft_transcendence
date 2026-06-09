import api from './client'
import axios from 'axios'

export type AuthErrorType =
  | 'INVALID_CREDENTIALS' // ログイン失敗（401）
  | 'CONFLICT' // 重複エラー（409）
  | 'BAD_REQUEST' // バリデーションエラー（400）
  | 'NETWORK_ERROR' // サーバーダウンなど
  | 'UNKNOWN'

export class AuthApiError extends Error {
  constructor(
    public type: AuthErrorType,
    message: string,
    public fields: ('email' | 'username')[] = [] // 409用の被ったフィールド情報
  ) {
    super(message)
    this.name = 'AuthApiError'

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

export const signInApi = async (data: {
  identifier: string
  password: string
}) => {
  try {
    const response = await api.post<{ accessToken: string }>(
      '/auth/signin',
      data
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

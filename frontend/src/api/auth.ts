import axios from 'axios'
import type { LoginCredentials, User } from '../types/user'

/**
 * Axios instance for API requests
 * Configured with base URL and credentials
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
  withCredentials: true,
})

export interface SignInResponse {
  accessToken: string
}

/**
 * Sign in with backend auth API.
 * VITE_API_URL should include the backend global prefix, for example:
 * http://localhost:3000/api
 */
export const signIn = async (
  credentials: LoginCredentials
): Promise<SignInResponse> => {
  const response = await api.post<SignInResponse>('/auth/signin', {
    email: credentials.email,
    password: credentials.password,
  })
  return response.data
}

/**
 * Get current logged-in user
 * @returns Promise<User> Current user data
 */
export const getCurrentUser = async (): Promise<User> => {
  // モックデータを返す（実際のAPIエンドポイントは未実装）
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: 'current-user-id',
        email: 'me@example.com',
        username: 'current_user',
        displayName: 'Current User',
        avatarUrl: '/avatars/default-1.svg',
        isGuest: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
      })
    }, 300)
  })

  // 実際のAPI実装時はこちらを使用
  // const response = await api.get<User>('/api/auth/me')
  // return response.data
}

/**
 * Logout current user
 * @returns Promise<void>
 */
export const logout = async (): Promise<void> => {
  await api.post('/api/auth/logout')
}

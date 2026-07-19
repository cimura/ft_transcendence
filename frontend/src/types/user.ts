/**
 * User type definitions
 */

export interface User {
  id: string
  email: string
  username: string
  displayName?: string
  avatarUrl?: string
  isGuest: boolean
  createdAt: Date
  updatedAt: Date
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
}

export interface LoginCredentials {
  identifier: string
  password: string
}

export interface RegisterCredentials {
  email: string
  username: string
  password: string
  passwordConfirm: string
}

export interface UserProfile extends Omit<User, 'email'> {
  email?: string
  isFriend: boolean
  isCurrentUser: boolean
}

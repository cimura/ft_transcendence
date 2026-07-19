import type { UserProfile } from '../types/user'
import type { UpdateProfileDto } from '../types/profile'
import api from './client'

interface BackendProfileUser {
  id: string
  email?: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
}

interface BackendProfileResponse {
  user: BackendProfileUser
}

export interface UpdateAvatarResponse {
  message: string
  avatarUrl: string
  user: BackendProfileUser
}

const toUserProfile = (
  user: BackendProfileUser,
  isCurrentUser: boolean
): UserProfile => ({
  id: user.id,
  email: user.email,
  username: user.username,
  displayName: user.displayName ?? undefined,
  avatarUrl: user.avatarUrl ?? undefined,
  isGuest: false,
  createdAt: new Date(user.createdAt),
  updatedAt: new Date(user.updatedAt),
  isFriend: false,
  isCurrentUser,
})

/**
 * Get user profile by ID
 * @param userId User ID to fetch
 * @returns Promise<UserProfile> User profile data
 */
export const getProfile = async (userId: string): Promise<UserProfile> => {
  const currentUserResponse =
    await api.get<BackendProfileResponse>('/users/profile')
  const currentUser = currentUserResponse.data.user

  if (currentUser.id === userId) {
    return toUserProfile(currentUser, true)
  }

  const response = await api.get<BackendProfileResponse>(
    `/users/${encodeURIComponent(userId)}/profile`
  )
  return toUserProfile(response.data.user, false)
}

/**
 * Update user profile
 * @param data Update data
 * @returns Promise<UserProfile> Updated user profile
 */
export const updateProfile = async (
  data: UpdateProfileDto
): Promise<UserProfile> => {
  const response = await api.patch<BackendProfileResponse>('/users/me', data)
  return toUserProfile(response.data.user, true)
}

/**
 * Upload avatar image
 * @param file Image file to upload
 * @returns Promise<{ avatarUrl: string }> New avatar URL
 */
export const uploadAvatar = async (file: File): Promise<UserProfile> => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post<UpdateAvatarResponse>(
    `/users/me/avatar`,
    formData,
    {
      headers: {
        'Content-Type': undefined,
      },
    }
  )
  return toUserProfile(response.data.user, true)
}

/**
 * Set default avatar
 * @param avatarUrl Default avatar URL
 * @returns Promise<{ avatarUrl: string }> New avatar URL
 */
export const setDefaultAvatar = async (
  avatarUrl: string
): Promise<{ avatarUrl: string }> => {
  const response = await api.patch<UpdateAvatarResponse>('/users/me/avatar', {
    avatarUrl,
  })
  return {
    avatarUrl: response.data.avatarUrl,
  }
}

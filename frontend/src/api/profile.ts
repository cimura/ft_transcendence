import type { UserProfile } from '../types/user'
import type { UpdateProfileDto } from '../types/profile'
import api from './client'

interface BackendProfileUser {
  id: string
  email: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
}

interface BackendProfileResponse {
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
 * モックユーザーデータ
 */
const mockUsers: Record<string, UserProfile> = {
  'current-user-id': {
    id: 'current-user-id',
    email: 'me@example.com',
    username: 'current_user',
    displayName: 'Current User',
    avatarUrl: '/avatars/default-1.svg',
    isGuest: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
    isFriend: false,
    isCurrentUser: true,
  },
  'user-1': {
    id: 'user-1',
    email: 'alice@example.com',
    username: 'alice',
    displayName: 'Alice',
    avatarUrl: '/avatars/default-2.svg',
    isGuest: false,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date(),
    isFriend: true,
    isCurrentUser: false,
  },
  'user-2': {
    id: 'user-2',
    email: 'bob@example.com',
    username: 'bob',
    displayName: 'Bob',
    avatarUrl: '/avatars/default-3.svg',
    isGuest: false,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date(),
    isFriend: false,
    isCurrentUser: false,
  },
  'user-3': {
    id: 'user-3',
    email: 'charlie@example.com',
    username: 'charlie',
    displayName: 'Charlie',
    avatarUrl: '/avatars/default-4.svg',
    isGuest: false,
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date(),
    isFriend: true,
    isCurrentUser: false,
  },
}

/**
 * Get user profile by ID
 * @param userId User ID to fetch
 * @returns Promise<UserProfile> User profile data
 */
export const getProfile = async (userId: string): Promise<UserProfile> => {
  const response = await api.get<BackendProfileResponse>('/users/profile')
  const currentUserProfile = toUserProfile(response.data.user, true)

  if (currentUserProfile.id === userId) {
    return currentUserProfile
  }

  // 他ユーザーのプロフィールAPIができるまで、固定モックを暫定利用する
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const user = mockUsers[userId]
      if (user) {
        resolve(user)
      } else {
        reject(new Error('User not found'))
      }
    }, 300)
  })
}

/**
 * Update user profile
 * @param userId User ID to update
 * @param data Update data
 * @returns Promise<UserProfile> Updated user profile
 */
export const updateProfile = async (
  userId: string,
  data: UpdateProfileDto
): Promise<UserProfile> => {
  // モックデータを更新
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const user = mockUsers[userId]
      if (user) {
        const updated = { ...user, ...data, updatedAt: new Date() }
        mockUsers[userId] = updated
        resolve(updated)
      } else {
        reject(new Error('User not found'))
      }
    }, 300)
  })

  // 実際のAPI実装時はこちらを使用
  // const response = await api.put<UserProfile>(`/api/users/${userId}`, data)
  // return response.data
}

/**
 * Upload avatar image
 * @param userId User ID
 * @param file Image file to upload
 * @returns Promise<{ avatarUrl: string }> New avatar URL
 */
export const uploadAvatar = async (
  userId: string,
  file: File
): Promise<{ avatarUrl: string }> => {
  // モックレスポンス（ファイルをローカルURLとして保存）
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (file.size > 5 * 1024 * 1024) {
        reject(new Error('File size exceeds 5MB'))
        return
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
      if (!allowedTypes.includes(file.type)) {
        reject(
          new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.')
        )
        return
      }

      // ローカルURLを生成（実際のアップロードはせず、プレビュー用）
      const avatarUrl = URL.createObjectURL(file)

      // モックデータを更新
      const user = mockUsers[userId]
      if (user) {
        user.avatarUrl = avatarUrl
        user.updatedAt = new Date()
      }

      resolve({ avatarUrl })
    }, 500)
  })

  // 実際のAPI実装時はこちらを使用
  // const formData = new FormData()
  // formData.append('file', file)
  // const response = await api.post<{ avatarUrl: string }>(
  //   `/api/users/${userId}/avatar`,
  //   formData,
  //   {
  //     headers: {
  //       'Content-Type': 'multipart/form-data',
  //     },
  //   }
  // )
  // return response.data
}

/**
 * Set default avatar
 * @param userId User ID
 * @param avatarUrl Default avatar URL
 * @returns Promise<{ avatarUrl: string }> New avatar URL
 */
export const setDefaultAvatar = async (
  userId: string,
  avatarUrl: string
): Promise<{ avatarUrl: string }> => {
  // モックデータを更新
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const user = mockUsers[userId]
      if (user) {
        user.avatarUrl = avatarUrl
        user.updatedAt = new Date()
        resolve({ avatarUrl })
      } else {
        reject(new Error('User not found'))
      }
    }, 300)
  })
}

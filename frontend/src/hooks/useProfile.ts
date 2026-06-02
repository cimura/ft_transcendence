import { useState, useEffect } from 'react'
import type { UserProfile } from '../types/user'
import type { UpdateProfileDto } from '../types/profile'
import * as profileApi from '../api/profile'

/**
 * Custom hook for fetching user profile
 * @param userId User ID to fetch
 * @returns Profile data, loading state, and error
 */
export const useProfile = (userId: string | undefined) => {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      // userIdが未定義の場合は初期状態にリセット
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfile(null)
      return
    }

    const fetchProfile = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await profileApi.getProfile(userId)
        setProfile(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch profile')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [userId])

  return { profile, loading, error }
}

/**
 * Custom hook for updating user profile
 * @returns Update function, loading state, and error
 */
export const useUpdateProfile = () => {
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const updateProfile = async (
    userId: string,
    data: UpdateProfileDto
  ): Promise<UserProfile | null> => {
    try {
      setLoading(true)
      setError(null)
      const updated = await profileApi.updateProfile(userId, data)
      return updated
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { updateProfile, loading, error }
}

/**
 * Custom hook for uploading avatar
 * @returns Upload function, loading state, and error
 */
export const useUploadAvatar = () => {
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const uploadAvatar = async (
    userId: string,
    file: File
  ): Promise<string | null> => {
    try {
      setLoading(true)
      setError(null)
      const { avatarUrl } = await profileApi.uploadAvatar(userId, file)
      return avatarUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload avatar')
      return null
    } finally {
      setLoading(false)
    }
  }

  const setDefaultAvatar = async (
    userId: string,
    avatarUrl: string
  ): Promise<string | null> => {
    try {
      setLoading(true)
      setError(null)
      const { avatarUrl: newAvatarUrl } = await profileApi.setDefaultAvatar(
        userId,
        avatarUrl
      )
      return newAvatarUrl
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to set default avatar'
      )
      return null
    } finally {
      setLoading(false)
    }
  }

  return { uploadAvatar, setDefaultAvatar, loading, error }
}

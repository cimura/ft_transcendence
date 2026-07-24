import api from './client'

export interface UpdateMeRequest {
  email?: string
  username?: string
  currentPassword?: string
  password?: string
}

export interface UpdateMeUser {
  id: string
  email: string
  username: string
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface UpdateMeResponse {
  message: string
  user: UpdateMeUser
}

export interface DeleteMeResponse {
  message: string
}

export const updateMe = async (
  data: UpdateMeRequest
): Promise<UpdateMeResponse> => {
  const response = await api.patch<UpdateMeResponse>('/users/me', data)
  return response.data
}

export const deleteMe = async (): Promise<DeleteMeResponse> => {
  const response = await api.delete<DeleteMeResponse>('/users/me')
  return response.data
}

import api from './client'

export interface ApiConflictError {
  statusCode: number
  error: string
  message: string
  fields: ('email' | 'username')[]
}

export const signUpApi = async (data: {
  email: string
  username: string
  password: string
}) => {
  const response = await api.post<{ id: string; accessToken: string }>(
    '/auth/signup',
    data
  )
  return response.data
}

export const signInApi = async (data: {
  identifier: string
  password: string
}) => {
  const response = await api.post<{ accessToken: string }>('/auth/signin', data)
  return response.data
}

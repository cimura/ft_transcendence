import api from './client'

export const getRoom = async (roomId: string) => {
  const response = await api.get(`/rooms/${roomId}`)
  return response.data
}

export const joinRoom = async (roomId: string) => {
  const response = await api.post(`/rooms/${roomId}/join`)
  return response.data
}

export const leaveRoom = async (roomId: string) => {
  const response = await api.post(`/rooms/${roomId}/leave`)
  return response.data
}

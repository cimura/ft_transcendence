import api from './client'
import type { CreateRoomDto } from '../types'
import type { RoomSnapshot } from '@ft_transcendence/shared/rooms-events.types'

export const getRooms = async (
  status?: 'waiting' | 'playing' | 'finished'
): Promise<RoomSnapshot[]> => {
  const response = await api.get('/rooms', {
    params: status ? { status } : undefined,
  })
  return response.data
}

export const createRoom = async (dto: CreateRoomDto): Promise<RoomSnapshot> => {
  const response = await api.post('/rooms', dto)
  return response.data
}

export const getRoom = async (roomId: string): Promise<RoomSnapshot> => {
  const response = await api.get(`/rooms/${roomId}`)
  return response.data
}

export const joinRoom = async (roomId: string): Promise<RoomSnapshot> => {
  const response = await api.post(`/rooms/${roomId}/join`)
  return response.data
}

export const leaveRoom = async (
  roomId: string
): Promise<{ deleted: true; roomId: string } | RoomSnapshot> => {
  const response = await api.post(`/rooms/${roomId}/leave`)
  return response.data
}

export const setRoomReady = async (
  roomId: string,
  isReady: boolean
): Promise<RoomSnapshot> => {
  const response = await api.post(`/rooms/${roomId}/ready`, { isReady })
  return response.data
}

export const startRoom = async (roomId: string): Promise<RoomSnapshot> => {
  const response = await api.post(`/rooms/${roomId}/start`)
  return response.data
}

export const createRoomInvitation = async (
  roomId: string,
  inviteeId: string
) => {
  const response = await api.post(`/rooms/${roomId}/invitations`, {
    inviteeId,
  })
  return response.data
}

export const acceptRoomInvitation = async (invitationId: string) => {
  const response = await api.put(`/rooms/invitations/${invitationId}/accept`)
  return response.data
}

export const declineRoomInvitation = async (invitationId: string) => {
  const response = await api.put(`/rooms/invitations/${invitationId}/decline`)
  return response.data
}

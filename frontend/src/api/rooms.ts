import api from './client'
import type { CreateRoomDto } from '../types'

export const createRoom = async (dto: CreateRoomDto) => {
  const response = await api.post('/rooms', dto)
  return response.data
}

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

export const setRoomReady = async (roomId: string, isReady: boolean) => {
  const response = await api.post(`/rooms/${roomId}/ready`, { isReady })
  return response.data
}

export const startRoom = async (roomId: string) => {
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

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

export type ChatConnectionStatus = 'connecting' | 'connected' | 'disconnected'

export interface ChatUser {
  id: string
  username: string
  avatarUrl?: string
}

export interface ChatMessage {
  id: string
  roomId: string
  userId?: string
  username: string
  text: string
  createdAt: string
}

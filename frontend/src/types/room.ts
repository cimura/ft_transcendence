export interface GameRoom {
  id: string
  name: string
  hostId: number
  hostName: string
  players: RoomPlayer[]
  maxPlayers: 2 | 3 | 4
  status: 'waiting' | 'playing' | 'finished'
  mapId?: string
  createdAt: Date
}

export interface RoomPlayer {
  userId: number
  username: string
  avatarUrl?: string
  isReady: boolean
  isHost: boolean
}

export interface CreateRoomDto {
  name: string
  maxPlayers: 2 | 3 | 4
  mapId?: string
}

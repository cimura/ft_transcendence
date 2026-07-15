export interface GameRoom {
  id: string
  name: string
  hostId: string
  hostName: string
  players: RoomPlayer[]
  maxPlayers: 2 | 3 | 4
  status: 'waiting' | 'playing' | 'finished'
  mode?: 'online' | 'local_cpu'
  mapId?: string
  createdAt: Date | string
  updatedAt?: Date | string
  startedAt?: Date | string | null
  finishedAt?: Date | string | null
}

export interface RoomPlayer {
  userId: string
  username: string
  avatarUrl?: string
  isReady: boolean
  isHost: boolean
}

export interface CreateRoomDto {
  name: string
  maxPlayers: 2 | 3 | 4
  gameId?: string
  mode?: 'online' | 'local_cpu'
  mapId?: string
}

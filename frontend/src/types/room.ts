export interface CreateRoomDto {
  name: string
  maxPlayers: 2 | 3 | 4
  gameId?: string
  mode?: 'online' | 'local_cpu'
  mapId?: string
}

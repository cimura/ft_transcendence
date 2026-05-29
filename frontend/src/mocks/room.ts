import type { GameRoom } from '../types/room'

export const mockRooms: GameRoom[] = [
  {
    id: '1',
    name: 'あつまれボンバーマン',
    hostId: 1,
    hostName: 'player1',
    players: [{ userId: 1, username: 'player1', isReady: true, isHost: true }],
    maxPlayers: 4,
    status: 'waiting',
    createdAt: new Date(),
  },
  {
    id: '2',
    name: 'たのしくボンバーマン',
    hostId: 2,
    hostName: 'player2',
    players: [{ userId: 2, username: 'player2', isReady: true, isHost: true }],
    maxPlayers: 2,
    status: 'playing',
    createdAt: new Date(),
  },
]

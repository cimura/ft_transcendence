import type { GameRoom } from '../types/room'

export const mockRooms: GameRoom[] = [
  {
    id: '1',
    name: 'あつまれボンバーマン',
    hostId: 'user-1',
    hostName: 'player1',
    players: [
      { userId: 'user-1', username: 'player1', isReady: true, isHost: true },
    ],
    maxPlayers: 4,
    status: 'waiting',
    createdAt: new Date(),
  },
  {
    id: '2',
    name: 'たのしくボンバーマン',
    hostId: 'user-2',
    hostName: 'player2',
    players: [
      { userId: 'user-2', username: 'player2', isReady: true, isHost: true },
    ],
    maxPlayers: 2,
    status: 'playing',
    createdAt: new Date(),
  },
]

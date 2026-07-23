import type { RoomSnapshot } from '@ft_transcendence/shared/rooms-events.types'
import type { GameRoom } from '../types/room'

/**
 * ソケット越しに届く RoomSnapshot (日時は ISO 文字列) を
 * フロントの GameRoom 型に変換する。useRoomSocket / useLobbySocket 共用。
 */
export function toGameRoom(snapshot: RoomSnapshot): GameRoom {
  return {
    id: snapshot.id,
    name: snapshot.name,
    hostId: snapshot.hostId,
    hostName: snapshot.hostName,
    players: snapshot.players.map((p) => ({
      userId: p.userId,
      username: p.username,
      avatarUrl: p.avatarUrl ?? undefined,
      isReady: p.isReady,
      isHost: p.isHost,
    })),
    maxPlayers: snapshot.maxPlayers as 2 | 3 | 4,
    status: snapshot.status,
    mode: snapshot.mode,
    mapId: snapshot.mapId,
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
    startedAt: snapshot.startedAt,
    finishedAt: snapshot.finishedAt,
  }
}

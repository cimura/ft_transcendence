import { GameSession } from '../../game.types';
import { START_POSITIONS } from '../setup/map.logic';

export const PLAYER_COLORS = [
  { color: '#ff8800', visorColor: '#00ff00' },
  { color: '#2563eb', visorColor: '#00ffff' },
  { color: '#dc2626', visorColor: '#ffff00' },
  { color: '#16a34a', visorColor: '#ff00ff' },
];

export function addPlayerToRoom(
  room: GameSession,
  playerId: string,
  clientId: string,
  username: string,
): void {
  const playerIndex = Object.keys(room.players).length % 4;
  const position = START_POSITIONS[playerIndex];
  const colors = PLAYER_COLORS[playerIndex];

  room.players[playerId] = {
    id: playerId,
    username,
    position: { x: position.x, z: position.z },
    direction: 'down',
    alive: true,
    color: colors.color,
    visorColor: colors.visorColor,
    isDisconnected: false,
  };
  room.stats[playerId] = {
    alive: true,
    blocksDestroyed: 0,
    bombsPlaced: 0,
    kills: 0,
    survivalTime: 0,
  };
  room.playerConnections[playerId] = {
    clientId: clientId,
    lastActiveTime: 0,
  };
}

export interface RemovePlayerResult {
  isEmpty: boolean; // 部屋が空になったかどうか
}

export function removePlayerFromRoom(
  room: GameSession,
  playerId: string,
  now: number,
): RemovePlayerResult {
  const result: RemovePlayerResult = { isEmpty: false };

  if (!room.players[playerId]) return result;

  delete room.players[playerId];
  delete room.stats[playerId];
  if (room.playerInputs) {
    delete room.playerInputs[playerId];
  }

  // 爆弾すり抜けリストからの除外
  if (room.bombPassingPlayers) {
    for (const bombId in room.bombPassingPlayers) {
      room.bombPassingPlayers[bombId] = room.bombPassingPlayers[bombId].filter(
        (id) => id !== playerId,
      );
    }
  }

  if (Object.keys(room.players).length === 0) {
    result.isEmpty = true;
  }

  return result;
}

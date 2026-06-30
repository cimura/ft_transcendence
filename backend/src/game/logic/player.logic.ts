import { GameSession } from '../game.types';
import { START_POSITIONS } from './map.logic';

export const PLAYER_COLORS = [
  { color: '#ff8800', visorColor: '#00ff00' },
  { color: '#2563eb', visorColor: '#00ffff' },
  { color: '#dc2626', visorColor: '#ffff00' },
  { color: '#16a34a', visorColor: '#ff00ff' },
];

export function addPlayerToRoom(
  room: GameSession,
  playerId: string,
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
    lastActiveTime: 0,
  };
  room.stats[playerId] = {
    alive: true,
    blocksDestroyed: 0,
    bombsPlaced: 0,
    kills: 0,
    survivalTime: 0,
  };
}

export interface RemovePlayerResult {
  isEmpty: boolean; // 部屋が空になったかどうか
  surrendered: boolean; // 試合中に降参した扱いかどうか
}

export function removePlayerFromRoom(
  room: GameSession,
  playerId: string,
  now: number,
): RemovePlayerResult {
  const result: RemovePlayerResult = { isEmpty: false, surrendered: false };

  if (!room.players[playerId]) return result;

  if (room.phase === 'playing') {
    // 試合中の切断：自爆（死亡）扱いにする
    room.players[playerId].alive = false;
    room.stats[playerId].survivalTime = now - (room.startedAt || now);
    result.surrendered = true;

    if (room.playerInputs) {
      delete room.playerInputs[playerId];
    }
  } else {
    // 待機中の切断：単に部屋から退室させる
    delete room.players[playerId];
    delete room.stats[playerId];
    if (room.playerInputs) {
      delete room.playerInputs[playerId];
    }
  }

  // 爆弾すり抜けリストからの除外（共通処理）
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

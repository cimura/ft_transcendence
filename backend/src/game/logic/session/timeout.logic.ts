import { GameSession } from '../../game.types';
import { DISCONNECT_TIMEOUT_MS } from '../../constants/game-constants';

export interface TimeoutResult {
  isAllDisconnectedTimeout: boolean;
}

/**
 * 1秒ごとに呼ばれ、タイムアウトしたプレイヤーの死亡処理と、
 * 全員切断による強制終了フラグの判定を行う。
 */
export function processTimeouts(room: GameSession, now: number): TimeoutResult {
  const result: TimeoutResult = { isAllDisconnectedTimeout: false };

  // 個人のタイムアウト判定（自爆処理）
  for (const playerId in room.players) {
    const player = room.players[playerId];
    const connection = room.playerConnections[playerId];

    if (player.alive && player.isDisconnected && connection) {
      if (now - connection.lastActiveTime >= DISCONNECT_TIMEOUT_MS) {
        player.alive = false;
        room.stats[playerId].survivalTime = now - (room.startedAt || now);
      }
    }
  }

  // 全員切断のタイムアウト判定
  const totalPlayers = Object.keys(room.players).length;
  if (
    totalPlayers > 0 &&
    room.disconnectedPlayers === totalPlayers &&
    room.disconnectedAt !== 0
  ) {
    if (now - room.disconnectedAt >= DISCONNECT_TIMEOUT_MS) {
      result.isAllDisconnectedTimeout = true;
    }
  }

  return result;
}

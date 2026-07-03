import { DISCONNECT_TIMEOUT_MS } from '../../constants/game-constants';
import { GameSession } from '../../game.types';
import type {
  PlayerStats,
  PlayerRanking,
  ServerToClientEvents,
} from '@ft_transcendence/shared/game-events.types';

/**
 * 勝敗判定およびリザルト集計のビジネスロジック
 * ゲームが終了条件を満たしていない場合は null を返す。
 * 終了条件を満たした場合は、生存時間の確定処理を行い、リザルトデータを返す。
 */
export function evaluateGameEnd(
  room: GameSession,
  now: number,
): Parameters<ServerToClientEvents['game:end']>[0] | null {
  if (room.phase !== 'playing') return null;

  const totalPlayers = Object.keys(room.players).length;
  if (totalPlayers === 0) return null;

  const livingPlayers = Object.values(room.players).filter((p) => p.alive);

  // 終了条件: 2人以上で開始した場合は生存者が1人以下になったら終了。
  // 1人のみのテストプレイ等の場合は、その1人が死んだら終了。
  const isGameOver =
    totalPlayers >= 2 ? livingPlayers.length <= 1 : livingPlayers.length === 0;
  // 終了条件: 全員が切断して DISCONNECT_TIMEOUT_MS 以上経過していたら終了。
  const isAllDisconnected = checkAllDisconnected(room, now);

  if (!isGameOver && !isAllDisconnected) return null;

  let winnerId: string | null = null;
  let isDraw = false;

  if (livingPlayers.length === 1) {
    winnerId = livingPlayers[0].id;
  } else if (livingPlayers.length === 0) {
    isDraw = true; // 全滅した場合は引き分け
  }

  Object.values(room.players).forEach((p) => {
    room.stats[p.id].alive = p.alive;

    if (p.alive) {
      room.stats[p.id].survivalTime = now - (room.startedAt || now);
    }
  });

  return {
    winnerId: winnerId,
    isDraw,
    rankings: getSortedRankings(room.stats),
  };
}

function checkAllDisconnected(room: GameSession, now: number): boolean {
  const totalPlayers = Object.keys(room.players).length;
  if (
    totalPlayers > 0 &&
    room.disconnectedPlayers == totalPlayers &&
    room.disconnectedAt !== 0 &&
    now - room.disconnectedAt >= DISCONNECT_TIMEOUT_MS
  ) {
    return true;
  }
  return false;
}

function getSortedRankings(
  playersRecord: Record<string, PlayerStats>,
): PlayerRanking[] {
  const entries = Object.entries(playersRecord);
  return entries.sort(sortPlayerRankings).map(([playerId, stats]) => ({
    playerId,
    ...stats,
  }));
}

function sortPlayerRankings(
  entryA: [string, PlayerStats],
  entryB: [string, PlayerStats],
) {
  const [, statsA] = entryA;
  const [, statsB] = entryB;

  if (statsB.alive !== statsA.alive) return statsB.alive ? 1 : -1;
  if (statsB.survivalTime !== statsA.survivalTime)
    return statsB.survivalTime - statsA.survivalTime;
  if (statsB.kills !== statsA.kills) return statsB.kills - statsA.kills;
  if (statsB.blocksDestroyed !== statsA.blocksDestroyed)
    return statsB.blocksDestroyed - statsA.blocksDestroyed;
  return statsB.bombsPlaced - statsA.bombsPlaced;
}

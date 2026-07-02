import { GameSession } from '../../game.types';
import type { ServerToClientEvents } from '@ft_transcendence/shared/game-events.types';

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

  if (!isGameOver) return null;

  let winnerId: string | null = null;
  let isDraw = false;

  if (livingPlayers.length === 1) {
    winnerId = livingPlayers[0].id;
  } else if (livingPlayers.length === 0) {
    isDraw = true; // 全滅した場合は引き分け
  }

  Object.values(room.players).forEach((p) => {
    room.stats[p.id].alive = p.alive;
    console.log(`room.stats[p.id].alive: ${room.stats[p.id].alive}`);

    if (p.alive) {
      room.stats[p.id].survivalTime = now - (room.startedAt || now);
    }
  });

  return {
    winnerId: winnerId,
    isDraw,
    rankings: room.stats,
  };
}

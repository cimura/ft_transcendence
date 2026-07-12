import { ServerToClientEvents } from '@ft_transcendence/shared/game-events.types';
import { GameSession } from '../../game.types';
import { updatePlayerMovements } from '../mechanics/movement.logic';
import { processExplosions, ExplosionResult } from '../mechanics/bomb.logic';
import { processTimeouts } from '../session/timeout.logic';
import { evaluateGameEnd } from '../session/end.logic';
import { GAME_TICK_RATE } from '../../constants/game-constants';

export interface TickResult {
  explosions: ExplosionResult[];
  isGameEnded: boolean;
  endResult?: Parameters<ServerToClientEvents['game:end']>[0];
}

export function advanceGameTick(room: GameSession, now: number): TickResult {
  room.serverTick++;

  updatePlayerMovements(room);
  const explosions = processExplosions(room, now);

  let isForceDraw = false;
  if (room.disconnectedPlayers > 0 && room.serverTick % GAME_TICK_RATE === 0) {
    const timeoutResult = processTimeouts(room, now);
    isForceDraw = timeoutResult.isAllDisconnectedTimeout;
  }

  const endResult = evaluateGameEnd(room, now, isForceDraw);

  return {
    explosions,
    isGameEnded: !!endResult,
    endResult: endResult || undefined,
  };
}

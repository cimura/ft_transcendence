import { GameSession } from '../../../common/types/game.type';
import {
  GAME_COUNTDOWN_SEC,
  GAME_TICK_RATE,
} from '../../constants/game-constants';

export function startCountdownLogic(
  room: GameSession,
  onCountdownEnd: () => void,
) {
  if (room.countdownTimerId) throw new Error('Countdown is already running.');
  if (room.phase !== 'waiting')
    throw new Error(`Invalid phase '${room.phase}'.`);

  room.phase = 'countdown';
  room.countdownTimerId = setTimeout(() => {
    room.countdownTimerId = undefined;
    onCountdownEnd();
  }, GAME_COUNTDOWN_SEC * 1000);
}

export function startGameLoopLogic(room: GameSession, onTick: () => void) {
  if (room.timerId) throw new Error('Game loop is already running.');
  if (room.phase !== 'countdown')
    throw new Error(`Invalid phase '${room.phase}'.`);

  room.phase = 'playing';
  room.startedAt = Date.now();

  room.timerId = setInterval(() => {
    onTick();
  }, 1000 / GAME_TICK_RATE);
}

export function stopGameLoopLogic(room: GameSession) {
  if (room.timerId) {
    room.phase = 'ended';
    clearInterval(room.timerId);
    room.timerId = undefined;
  }
}

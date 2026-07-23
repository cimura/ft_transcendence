import { Injectable, Logger } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Server } from 'socket.io';
import {
  Direction,
  ServerToClientEvents,
} from '@ft_transcendence/shared/game-events.types';
import {
  GAME_COUNTDOWN_SEC,
  DISCONNECT_TIMEOUT_MS,
} from './constants/game-constants';
import { GameSession } from '../common/types/game.type';
import { RoomsStateService } from '../rooms/rooms-state.service';
import { advanceGameTick } from './logic/core/loop.logic';
import { createInitialMap, START_POSITIONS } from './logic/setup/map.logic';
import {
  startCountdownLogic,
  startGameLoopLogic,
  stopGameLoopLogic,
} from './logic/session/lifecycle.logic';
import {
  addPlayerToRoom,
  removePlayerFromRoom,
  reconnectPlayerToRoom,
  disconnectPlayerFromRoom,
} from './logic/session/player.logic';
import { tryPlaceBomb } from './logic/mechanics/bomb.logic';
import { ScoresService } from '../scores/scores.service';
import { bombermanGame } from '../games/games.constants';

@Injectable()
export class GameService {
  private static readonly brand = 'GameService';
  private readonly logger = new Logger(GameService.brand);
  private server: Server;

  constructor(
    private readonly scoresService: ScoresService,
    private readonly roomsState: RoomsStateService,
  ) {}

  setServer(server: Server) {
    this.server = server;
  }

  handleGameJoin(
    roomId: string,
    playerId: string,
    clientId: string,
  ): Parameters<ServerToClientEvents['game:init']>[0] {
    if (!this.checkRoomEntryPermission(roomId, playerId)) {
      throw new WsException('Cannot join the room');
    }

    const session = this.getOrCreateSession(roomId);
    const roomState = this.roomsState.getRoom(roomId)!;

    const username = roomState.participants[playerId].username;

    if (session.phase === 'waiting') {
      const result = addPlayerToRoom(session, playerId, clientId, username);
      if (!result.success) {
        throw new WsException('Cannot join the room');
      }
      this.server.to(session.roomId).emit('game:state', {
        players: session.players,
        bombs: session.bombs,
      });
      this.logger.log(
        `Player joined { roomId: '${session.roomId}', playerId: '${playerId}' }`,
      );
    } else if (session.phase === 'countdown' || session.phase === 'playing') {
      const result = reconnectPlayerToRoom(session, playerId, clientId);
      if (!result.success) {
        throw new WsException('Cannot join the room');
      }
      this.server.to(roomId).emit('game:state', {
        players: session.players,
        bombs: session.bombs,
      });
      this.logger.debug(
        `Player reconnected { roomId: '${session.roomId}', playerId: '${playerId}' }`,
      );
    }

    return {
      yourId: playerId,
      serverTime: Date.now(),
      map: session.map,
      players: session.players,
      bombs: session.bombs,
      phase: session.phase,
    };
  }

  handleGameStart(roomId: string) {
    const roomState = this.roomsState.getRoom(roomId);
    if (!roomState || !roomState.gameSession) return;
    const session = roomState.gameSession;

    if (
      Object.keys(session.players).length !== roomState.maxPlayers ||
      session.phase !== 'waiting'
    ) {
      return;
    }

    try {
      startCountdownLogic(session, () => {
        try {
          if (!this.roomsState.getRoom(session.roomId)) return;

          startGameLoopLogic(session, () => this.onGameTick(session));

          this.server.to(session.roomId).emit('game:playing');
          this.logger.log(`Game loop started { roomId: '${session.roomId}' }`);
        } catch (error) {
          this.handleGameError(
            session.roomId,
            error,
            'Failed to start game loop.',
          );
        }
      });

      const startsAt = Date.now() + GAME_COUNTDOWN_SEC * 1000;
      this.server
        .to(roomId)
        .emit('game:countdown', { seconds: GAME_COUNTDOWN_SEC, startsAt });
      this.logger.log(`Countdown started { roomId: '${session.roomId}' }`);
    } catch (error) {
      this.handleGameError(roomId, error, 'Failed to start countdown.');
    }
  }

  handleGameLeave(roomId: string, playerId: string, clientId: string) {
    const session = this.roomsState.getRoom(roomId)?.gameSession;
    if (!session || !session.players[playerId]) return;

    if (session.playerConnections[playerId].clientId !== clientId) {
      this.logger.debug(
        `Ignored disconnect from different socket { roomId: '${session.roomId}', playerId: '${playerId}' }`,
      );
      return;
    }

    if (session.phase === 'waiting' || session.phase === 'ended') {
      const result = removePlayerFromRoom(session, playerId);
      if (result.success) {
        this.logger.log(
          `Player left { roomId: '${session.roomId}', playerId: '${playerId}' }`,
        );
        if (result.isEmpty) {
          this.cleanupRoom(session.roomId); // 全員退出時にメモリ解放
        }
      }
    } else if (session.phase === 'countdown' || session.phase === 'playing') {
      const result = disconnectPlayerFromRoom(session, playerId, Date.now());
      if (result.success) {
        this.logger.debug(
          `Player disconnected { roomId: '${session.roomId}', playerId: '${playerId}' }`,
        );
        if (result.isAllDisconnected) {
          this.logger.log(
            `All players disconnected { roomId: '${session.roomId}' }`,
          );
        }
      }
    }
  }

  handlePlayerInput(
    roomId: string,
    playerId: string,
    direction: Direction | null,
    seq: number,
  ) {
    const session = this.roomsState.getRoom(roomId)?.gameSession;
    if (!session || session.phase !== 'playing') return;

    if (!session.playerInputs) session.playerInputs = {};
    session.playerInputs[playerId] = { direction, seq };
  }

  handleBombPlace(roomId: string, playerId: string) {
    const session = this.roomsState.getRoom(roomId)?.gameSession;
    if (!session || session.phase !== 'playing') return;

    const bomb = tryPlaceBomb(session, playerId, Date.now());
    if (bomb) {
      this.server.to(roomId).emit('bomb:spawn', { bomb });
    }
  }

  private handleGameError(
    roomId: string,
    error: unknown,
    defaultMessage: string,
  ) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(
      `${defaultMessage} { roomId: '${roomId}', error: '${errorMessage}' }`,
    );
    this.server.to(roomId).emit('game:error', { message: defaultMessage });
    this.cleanupRoom(roomId);
  }

  private checkRoomEntryPermission(roomId: string, playerId: string): boolean {
    const roomState = this.roomsState.getRoom(roomId);
    if (!roomState) return false;

    // ルームの参加者として登録されているか確認
    if (!roomState.participants[playerId]) return false;

    const session = roomState.gameSession;
    if (!session) return true; // まだセッションが作られていない(WAITING)なら参加可能

    if (session.phase === 'ended') return false;

    const player = session.players[playerId];
    if (session.phase === 'waiting') return true;

    if (!player) return false;
    if (!player.isDisconnected) return false;

    const connection = session.playerConnections[playerId];
    if (!connection) return false;

    const isTimedOut =
      Date.now() - connection.lastActiveTime >= DISCONNECT_TIMEOUT_MS;
    if (isTimedOut) return false;

    return true;
  }

  private getOrCreateSession(roomId: string): GameSession {
    const roomState = this.roomsState.getRoom(roomId);
    if (!roomState) {
      throw new WsException('Room not found');
    }

    if (!roomState.gameSession) {
      roomState.gameSession = {
        roomId,
        phase: 'waiting',
        map: createInitialMap(),
        players: {},
        bombs: {},
        serverTick: 0,
        playerInputs: {},
        bombPassingPlayers: {},
        startPositionSlots: Array<string | null>(START_POSITIONS.length).fill(
          null,
        ),
        playerConnections: {},
        disconnectedPlayers: 0,
        disconnectedAt: 0,
        stats: {},
      };
      this.logger.log(`GameSession initialized { roomId: '${roomId}' }`);
    }
    return roomState.gameSession;
  }

  private onGameTick(session: GameSession) {
    const now = Date.now();
    try {
      const result = advanceGameTick(session, now);

      for (const exp of result.explosions) {
        this.server.to(session.roomId).emit('bomb:explode', { ...exp });
      }

      this.server.to(session.roomId).emit('game:state', {
        players: session.players,
        bombs: session.bombs,
      });

      if (result.isGameEnded && result.endResult) {
        this.server.to(session.roomId).emit('game:end', result.endResult);
        void this.recordMatchResult(session, now, result.endResult);
        this.cleanupRoom(session.roomId);
      }
    } catch (error) {
      this.handleGameError(session.roomId, error, 'Game tick failed.');
    }
  }

  private async recordMatchResult(
    session: GameSession,
    finishedAtMs: number,
    endResult: NonNullable<ReturnType<typeof advanceGameTick>['endResult']>,
  ) {
    try {
      await this.scoresService.recordMatchResult({
        gameType: bombermanGame.name,
        finishedAt: new Date(finishedAtMs),
        winnerId: endResult.winnerId,
        isDraw: endResult.isDraw,
        rankings: endResult.rankings,
      });
    } catch (error) {
      this.logger.error(
        `Failed to record match result for room ${session.roomId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private cleanupRoom(roomId: string) {
    const roomState = this.roomsState.getRoom(roomId);
    const session = roomState?.gameSession;

    if (session) {
      stopGameLoopLogic(session);
      if (session.countdownTimerId) {
        clearTimeout(session.countdownTimerId);
        session.countdownTimerId = undefined;
      }
    }

    this.roomsState.deleteRoom(roomId);
    this.logger.log(`Room deleted and memory freed { roomId: '${roomId}' }`);
  }
}

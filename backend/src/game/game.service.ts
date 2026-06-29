import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import {
  Direction,
  ServerToClientEvents,
} from '@ft_transcendence/shared/game-events.types';
import { GAME_COUNTDOWN_SEC, GAME_TICK_RATE } from './constants/game-constants';
import { GameSession } from './game.types';
import { createInitialMap } from './logic/map.logic';
import { processExplosions, tryPlaceBomb } from './logic/bomb.logic';
import { updatePlayerMovements } from './logic/movement.logic';
import { evaluateGameEnd } from './logic/end.logic';
import { addPlayerToRoom, removePlayerFromRoom } from './logic/player.logic';

const MIN_PLAYERS_TO_START = 2;

@Injectable()
export class GameService {
  private static readonly brand = 'GameService';
  private readonly logger = new Logger(GameService.brand);

  private rooms = new Map<string, GameSession>();
  private server: Server;

  setServer(server: Server) {
    this.server = server;
  }

  handleGameJoin(
    roomId: string,
    playerId: string,
  ): Parameters<ServerToClientEvents['game:init']>[0] {
    // TODO: 再接続されたときにルームに参加を許可するかどうかの処理
    const room = this.getOrCreateRoom(roomId);
    // TODO: playerIdを使ってusernameをデータベースから引っ張ってくる処理(一旦仮の'test-username'で統一)
    addPlayerToRoom(room, playerId, 'test-username');
    // DEBUG: 2人での動作確認のための仮条件（本来はLobby側で管理）
    if (
      Object.keys(room.players).length >= MIN_PLAYERS_TO_START &&
      room.phase === 'waiting'
    ) {
      this.startCountdown(room.roomId);
    }

    return {
      yourId: playerId,
      serverTime: Date.now(),
      mapRevision: room.mapRevision,
      map: room.map,
      players: room.players,
      bombs: room.bombs,
      phase: room.phase,
    };
  }

  handleGameLeave(playerId: string) {
    const now = Date.now();
    for (const room of this.rooms.values()) {
      if (room.players[playerId]) {
        this.executeRemovePlayer(room, playerId, now);
      }
    }
  }

  handlePlayerInput(
    roomId: string,
    playerId: string,
    direction: Direction | null,
    seq: number,
  ) {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'playing') return;

    if (!room.playerInputs) room.playerInputs = {};
    const currentInput = room.playerInputs[playerId];
    if (currentInput && seq <= currentInput.seq) return;
    room.playerInputs[playerId] = { direction, seq };
  }

  handleBombPlace(roomId: string, playerId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const bomb = tryPlaceBomb(room, playerId, Date.now());

    if (bomb) {
      this.server.to(roomId).emit('bomb:spawn', { bomb });
    }
  }

  private getOrCreateRoom(roomId: string): GameSession {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        roomId,
        phase: 'waiting',
        mapRevision: 1,
        map: createInitialMap(),
        players: {},
        bombs: {},
        serverTick: 0,
        playerInputs: {},
        bombPassingPlayers: {},
        stats: {},
      };
      this.rooms.set(roomId, room);
      this.logger.log(`Room created: ${roomId}`);
    }
    return room;
  }

  private executeRemovePlayer(
    room: GameSession,
    playerId: string,
    now: number,
  ) {
    const result = removePlayerFromRoom(room, playerId, now);

    if (result.surrendered) {
      this.logger.log(
        `Player ${playerId} disconnected and surrendered in room ${room.roomId}`,
      );
      this.server.to(room.roomId).emit('game:state', {
        serverTick: room.serverTick,
        serverTime: now,
        mapRevision: room.mapRevision,
        players: room.players,
        bombs: room.bombs,
        phase: room.phase,
      });
      this.checkGameEnd(room, now);
    } else {
      this.logger.log(`Player ${playerId} removed from room ${room.roomId}`);
    }

    if (room.phase === 'countdown') {
      this.cancelCountdownIfStartConditionIsNotMet(room, now);
    }

    if (result.isEmpty) {
      this.stopGameLoop(room.roomId);
      if (room.countdownTimerId) {
        clearTimeout(room.countdownTimerId);
        room.countdownTimerId = undefined;
      }
      this.rooms.delete(room.roomId);
      this.logger.log(`Room ${room.roomId} deleted because it is empty`);
    }
  }

  private startCountdown(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.phase = 'countdown';

    const startsAt = Date.now() + GAME_COUNTDOWN_SEC * 1000;

    this.server.to(roomId).emit('game:countdown', {
      seconds: GAME_COUNTDOWN_SEC,
      startsAt: startsAt,
    });
    this.logger.log(
      `Room ${roomId} countdown started. Game starts at ${startsAt}`,
    );

    room.countdownTimerId = setTimeout(() => {
      room.countdownTimerId = undefined;
      this.startGameLoop(roomId);
    }, GAME_COUNTDOWN_SEC * 1000);
  }

  private startGameLoop(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room || room.timerId) return;

    if (
      room.phase !== 'countdown' ||
      Object.keys(room.players).length < MIN_PLAYERS_TO_START
    ) {
      room.phase = 'waiting';
      return;
    }

    room.phase = 'playing';
    room.startedAt = Date.now();

    room.timerId = setInterval(() => {
      this.updateGame(room);
    }, 1000 / GAME_TICK_RATE);

    this.logger.log(`Game loop started for room: ${roomId}`);
  }

  private updateGame(room: GameSession) {
    room.serverTick++;
    const now = Date.now();

    updatePlayerMovements(room);
    const explosionResults = processExplosions(room, now);

    for (const res of explosionResults) {
      this.server.to(room.roomId).emit('bomb:explode', {
        bombId: res.bombId,
        affectedTiles: res.affectedTiles,
        destroyedBlocks: res.destroyedBlocks,
        damagedPlayerIds: res.damagedPlayerIds,
        mapRevision: room.mapRevision,
      });
    }

    this.server.to(room.roomId).emit('game:state', {
      serverTick: room.serverTick,
      serverTime: now,
      mapRevision: room.mapRevision,
      players: room.players,
      bombs: room.bombs,
      phase: room.phase,
    });

    this.checkGameEnd(room, now);
  }

  private checkGameEnd(room: GameSession, now: number) {
    const endResult = evaluateGameEnd(room, now);
    if (!endResult) return;

    room.phase = 'ended';
    this.stopGameLoop(room.roomId);

    this.server.to(room.roomId).emit('game:end', {
      winnerId: endResult.winnerId,
      isDraw: endResult.isDraw,
      rankings: endResult.rankings,
    });

    this.rooms.delete(room.roomId);
    this.logger.log(`Room ${room.roomId} deleted after game end`);
  }

  private stopGameLoop(roomId: string) {
    const room = this.rooms.get(roomId);
    if (room && room.timerId) {
      clearInterval(room.timerId);
      room.timerId = undefined;
      this.logger.log(`Game loop stopped for room: ${roomId}`);
    }
  }

  private cancelCountdownIfStartConditionIsNotMet(
    room: GameSession,
    now: number,
  ) {
    if (Object.keys(room.players).length >= MIN_PLAYERS_TO_START) return;

    if (room.countdownTimerId) {
      clearTimeout(room.countdownTimerId);
      room.countdownTimerId = undefined;
    }

    room.phase = 'waiting';
    this.server.to(room.roomId).emit('game:state', {
      serverTick: room.serverTick,
      serverTime: now,
      mapRevision: room.mapRevision,
      players: room.players,
      bombs: room.bombs,
      phase: room.phase,
    });
    this.logger.log(
      `Room ${room.roomId} countdown cancelled because start condition is not met`,
    );
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Server } from 'socket.io';
import {
  Direction,
  ServerToClientEvents,
} from '@ft_transcendence/shared/game-events.types';
import {
  GAME_COUNTDOWN_SEC,
  GAME_TICK_RATE,
  DISCONNECT_TIMEOUT_MS,
} from './constants/game-constants';
import { GameSession } from './game.types';
import { createInitialMap } from './logic/setup/map.logic';
import { processExplosions, tryPlaceBomb } from './logic/mechanics/bomb.logic';
import { updatePlayerMovements } from './logic/mechanics/movement.logic';
import { evaluateGameEnd } from './logic/session/end.logic';
import {
  addPlayerToRoom,
  removePlayerFromRoom,
} from './logic/session/player.logic';

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
    if (!this.checkRoomEntryPermission(roomId, playerId)) {
      throw new WsException('Cannot join the room');
    }
    const room = this.getOrCreateRoom(roomId);
    const player = room.players[playerId];
    if (room.phase === 'waiting') {
      // TODO: playerIdを使ってusernameをデータベースから引っ張ってくる処理(一旦仮の'test-username'で統一)
      addPlayerToRoom(room, playerId, 'test-username');
    } else if (room.phase === 'countdown' || room.phase === 'playing') {
      if (player && player.isDisconnected) {
        player.isDisconnected = false;
        room.disconnectedPlayers -= 1;
        room.disconnectedAt = 0; // 誰か一人でも戻ってきたらルームタイマーをリセット
      }
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

  handleGameStart(roomId: string) {
    // すでにRoomに参加したあとの処理なので、roomが存在する前提で扱う
    const room = this.getOrCreateRoom(roomId);
    // DEBUG: 2人での動作確認のための仮条件（本来はLobby側で管理）
    if (
      Object.keys(room.players).length >= MIN_PLAYERS_TO_START &&
      room.phase === 'waiting'
    ) {
      this.startCountdown(room.roomId);
      console.log(`[service] handleGameStart room.phase: ${room.phase}`);
    }
  }

  handleGameLeave(playerId: string) {
    const now = Date.now();
    for (const room of this.rooms.values()) {
      if (room.players[playerId]) {
        if (room.phase === 'waiting' || room.phase === 'ended') {
          // room から削除
          this.executeRemovePlayer(room, playerId, now);
        } else if (room.phase === 'countdown' || room.phase === 'playing') {
          const player = room.players[playerId];
          if (!player.isDisconnected) {
            // 切断時の時間を保存（タイムアウト判定のため）
            player.isDisconnected = true;
            player.lastActiveTime = Date.now();
            room.disconnectedPlayers += 1;
            // room 自体の寿命を図るため、現在の時間を保存
            const totalPlayers = Object.keys(room.players).length;
            if (room.disconnectedPlayers === totalPlayers) {
              room.disconnectedAt = Date.now();
            }
          }
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

  private checkRoomEntryPermission(roomId: string, playerId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      // TODO: LobbyAPI と繋げたら false にする（現在は暫定許容）
      return true;
    }
    if (room.phase === 'ended') {
      return false;
    }

    const player = room.players[playerId];

    if (room.phase === 'waiting') {
      // TODO: MIN_PLAYERS_TO_START ではなく MAX_PLAYERS など適切な定数に変更する
      if (!player && Object.keys(room.players).length >= MIN_PLAYERS_TO_START) {
        return false;
      }
      return true;
    }

    if (room.phase === 'countdown' || room.phase === 'playing') {
      // プレイヤー情報がない、または切断扱いになっていない（多重ログイン防止）場合は弾く
      if (!player || !player.isDisconnected) {
        return false;
      }
      // タイムアウトチェック
      const isTimedOut =
        Date.now() - player.lastActiveTime >= DISCONNECT_TIMEOUT_MS;
      if (isTimedOut) {
        return false;
      }
      return true;
    }

    return false;
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
        disconnectedPlayers: 0,
        disconnectedAt: 0,
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

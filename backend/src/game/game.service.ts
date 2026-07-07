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
import { processTimeouts } from './logic/session/timeout.logic';

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
    clientId: string,
  ): Parameters<ServerToClientEvents['game:init']>[0] {
    if (!this.checkRoomEntryPermission(roomId, playerId)) {
      throw new WsException('Cannot join the room');
    }
    const room = this.getOrCreateRoom(roomId);
    const player = room.players[playerId];
    if (room.phase === 'waiting') {
      // TODO: playerIdを使ってusernameをデータベースから引っ張ってくる処理(一旦仮の'test-username'で統一)
      addPlayerToRoom(room, playerId, clientId, 'test-username');
      this.server.to(room.roomId).emit('game:state', {
        players: room.players,
        bombs: room.bombs,
      });
      this.logger.log(
        `Player joined { roomId: '${room.roomId}', playerId: '${playerId}' }`,
      );
    } else if (room.phase === 'countdown' || room.phase === 'playing') {
      if (player && player.isDisconnected) {
        player.isDisconnected = false;
        room.playerConnections[playerId].clientId = clientId;
        room.playerConnections[playerId].lastActiveTime = 0;
        room.disconnectedPlayers -= 1;
        room.disconnectedAt = 0; // 誰か一人でも戻ってきたらルームタイマーをリセット
        if (room.playerInputs[playerId]) {
          // 再接続時はクライアントが送るseqが初期値に戻るため、サーバー側も初期化する
          room.playerInputs[playerId].seq = 0;
        }
        this.logger.debug(
          `Player reconnected { roomId: '${room.roomId}', playerId: '${playerId}' }`,
        );
      }
    }

    return {
      yourId: playerId,
      serverTime: Date.now(),
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
    }
  }

  handleGameLeave(playerId: string, clientId: string) {
    for (const room of this.rooms.values()) {
      if (room.players[playerId]) {
        if (room.playerConnections[playerId].clientId !== clientId) {
          // 以前のソケットインスタンスの切断イベントは無視する
          this.logger.debug(
            `Ignored disconnect from different socket { roomId: '${room.roomId}', playerId: '${playerId}', socketId: '${clientId}' }`,
          );
          continue;
        }
        if (room.phase === 'waiting' || room.phase === 'ended') {
          // room から削除
          this.executeRemovePlayer(room, playerId);
        } else if (room.phase === 'countdown' || room.phase === 'playing') {
          if (!room.players[playerId].isDisconnected) {
            // 切断時の時間を保存（タイムアウト判定のため）
            room.players[playerId].isDisconnected = true;
            room.playerConnections[playerId].clientId = '';
            room.playerConnections[playerId].lastActiveTime = Date.now();
            this.logger.debug(
              `Player disconnected { roomId: '${room.roomId}', playerId: '${playerId}' }`,
            );
            room.disconnectedPlayers += 1;
            // room 自体の寿命を図るため、現在の時間を保存
            const totalPlayers = Object.keys(room.players).length;
            if (room.disconnectedPlayers === totalPlayers) {
              room.disconnectedAt = Date.now();
              this.logger.log(
                `All players disconnected { roomId: '${room.roomId}' }`,
              );
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
      // TODO: MIN_PLAYERS_TO_START ではなく MAX_PLAYERS など適切な値に変更する
      if (!player && Object.keys(room.players).length >= MIN_PLAYERS_TO_START) {
        return false;
      }
      return true;
    }

    if (room.phase === 'countdown' || room.phase === 'playing') {
      // プレイヤー情報がない
      if (!player) {
        return false;
      }
      if (!player.isDisconnected) {
        // 切断扱いになっていない（多重ログイン防止）
        return false;
      }
      // タイムアウトかどうか
      const connection = room.playerConnections[playerId];
      if (!connection) return false;
      const isTimedOut =
        Date.now() - connection.lastActiveTime >= DISCONNECT_TIMEOUT_MS;
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
        map: createInitialMap(),
        players: {},
        bombs: {},
        serverTick: 0,
        playerInputs: {},
        bombPassingPlayers: {},
        playerConnections: {},
        disconnectedPlayers: 0,
        disconnectedAt: 0,
        stats: {},
      };
      this.rooms.set(roomId, room);
      this.logger.log(`Room created { roomId: '${roomId}' }`);
    }
    return room;
  }

  private executeRemovePlayer(room: GameSession, playerId: string) {
    const result = removePlayerFromRoom(room, playerId);
    this.logger.log(
      `Player left { roomId: '${room.roomId}', playerId: '${playerId}' }`,
    );

    if (result.isEmpty) {
      this.stopGameLoop(room.roomId);
      if (room.countdownTimerId) {
        clearTimeout(room.countdownTimerId);
        room.countdownTimerId = undefined;
      }
      this.logger.log(`Room deleted { roomId: '${room.roomId}' }`);
      this.rooms.delete(room.roomId);
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
    this.logger.debug(`Countdown started { roomId: '${room.roomId}' }`);

    room.countdownTimerId = setTimeout(() => {
      room.countdownTimerId = undefined;
      this.startGameLoop(roomId);
      this.server.to(roomId).emit('game:playing');
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
    this.logger.log(`Game loop started { roomId: '${roomId}' }`);
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
      });
    }

    let isForceDraw = false;

    if (
      room.disconnectedPlayers > 0 &&
      room.serverTick % GAME_TICK_RATE === 0
    ) {
      const timeoutResult = processTimeouts(room, now);
      isForceDraw = timeoutResult.isAllDisconnectedTimeout;
    }

    this.server.to(room.roomId).emit('game:state', {
      players: room.players,
      bombs: room.bombs,
    });

    this.checkGameEnd(room, now, isForceDraw);
  }

  private checkGameEnd(room: GameSession, now: number, isForceDraw: boolean) {
    const endResult = evaluateGameEnd(room, now, isForceDraw);
    if (!endResult) return;

    room.phase = 'ended';
    this.stopGameLoop(room.roomId);

    this.server.to(room.roomId).emit('game:end', {
      winnerId: endResult.winnerId,
      isDraw: endResult.isDraw,
      rankings: endResult.rankings,
    });

    this.logger.log(`Room deleted { roomId: '${room.roomId}' }`);
    this.rooms.delete(room.roomId);
  }

  private stopGameLoop(roomId: string) {
    const room = this.rooms.get(roomId);
    if (room && room.timerId) {
      clearInterval(room.timerId);
      room.timerId = undefined;
      this.logger.log(`Game loop stopped { roomId: '${roomId}' }`);
    }
  }
}

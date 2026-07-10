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
import { GameSession } from './game.types';
import { advanceGameTick } from './logic/core/loop.logic';
import { createInitialMap } from './logic/setup/map.logic';
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
import { START_POSITIONS } from './logic/setup/map.logic';

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
    if (room.phase === 'waiting') {
      // 新規プレイヤーの参加
      // TODO: playerIdを使ってusernameをデータベースから引っ張ってくる処理(一旦仮の'test-username'で統一)
      const result = addPlayerToRoom(room, playerId, clientId, 'test-username');
      if (result.success) {
        this.server.to(room.roomId).emit('game:state', {
          players: room.players,
          bombs: room.bombs,
        });
        this.logger.log(
          `Player joined { roomId: '${room.roomId}', playerId: '${playerId}' }`,
        );
      }
    } else if (room.phase === 'countdown' || room.phase === 'playing') {
      // 既存プレイヤーの再接続
      const result = reconnectPlayerToRoom(room, playerId, clientId);

      if (result.success) {
        this.server.to(roomId).emit('game:state', {
          players: room.players,
          bombs: room.bombs,
        });
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
    const room = this.getOrCreateRoom(roomId);

    // DEBUG: 2人での動作確認のための仮条件
    if (
      Object.keys(room.players).length < MIN_PLAYERS_TO_START ||
      room.phase !== 'waiting'
    ) {
      return;
    }

    try {
      startCountdownLogic(room, () => {
        try {
          if (!this.rooms.has(room.roomId)) return;

          startGameLoopLogic(room, () => this.onGameTick(room));

          this.server.to(room.roomId).emit('game:playing');
          this.logger.log(`Game loop started { roomId: '${room.roomId}' }`);
        } catch (error) {
          this.handleGameError(
            room.roomId,
            error,
            'Failed to start game loop.',
          );
        }
      });

      const startsAt = Date.now() + GAME_COUNTDOWN_SEC * 1000;
      this.server
        .to(roomId)
        .emit('game:countdown', { seconds: GAME_COUNTDOWN_SEC, startsAt });
      this.logger.log(`Countdown started { roomId: '${room.roomId}' }`);
    } catch (error) {
      this.handleGameError(roomId, error, 'Failed to start countdown.');
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
          // 完全に room から削除
          const result = removePlayerFromRoom(room, playerId);

          if (result.success) {
            this.logger.log(
              `Player left { roomId: '${room.roomId}', playerId: '${playerId}' }`,
            );
            if (result.isEmpty) {
              this.cleanupRoom(room.roomId);
            }
          }
        } else if (room.phase === 'countdown' || room.phase === 'playing') {
          // 一時的な切断状態への移行
          const result = disconnectPlayerFromRoom(room, playerId, Date.now());

          if (result.success) {
            this.logger.debug(
              `Player disconnected { roomId: '${room.roomId}', playerId: '${playerId}' }`,
            );
            if (result.isAllDisconnected) {
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
    if (!room || room.phase !== 'playing') return;

    const bomb = tryPlaceBomb(room, playerId, Date.now());

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
        startPositionSlots: Array(START_POSITIONS.length).fill(null),
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

  private onGameTick(room: GameSession) {
    const now = Date.now();

    const result = advanceGameTick(room, now);

    for (const exp of result.explosions) {
      this.server.to(room.roomId).emit('bomb:explode', { ...exp });
    }

    this.server.to(room.roomId).emit('game:state', {
      players: room.players,
      bombs: room.bombs,
    });

    if (result.isGameEnded && result.endResult) {
      this.server.to(room.roomId).emit('game:end', result.endResult);
      this.cleanupRoom(room.roomId);
    }
  }

  private cleanupRoom(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    stopGameLoopLogic(room);

    if (room.countdownTimerId) {
      clearTimeout(room.countdownTimerId);
      room.countdownTimerId = undefined;
    }

    this.rooms.delete(roomId);
    this.logger.log(`Room deleted { roomId: '${roomId}' }`);
  }
}

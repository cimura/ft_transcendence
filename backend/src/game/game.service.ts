import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { Direction } from '@ft_transcendence/shared/game-events.types';
import { GameSession } from './game.types';
import { createInitialMap } from './logic/map.logic';
import { processExplosions, tryPlaceBomb } from './logic/bomb.logic';
import { updatePlayerMovements } from './logic/movement.logic';
import { evaluateGameEnd } from './logic/end.logic';
import { addPlayerToRoom, removePlayerFromRoom } from './logic/player.logic';

@Injectable()
export class GameService {
  private static readonly brand = 'GameService';
  private readonly logger = new Logger(GameService.brand);

  private rooms = new Map<string, GameSession>();
  private server: Server;

  setServer(server: Server) {
    this.server = server;
  }

  getOrCreateRoom(roomId: string): GameSession {
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

  addPlayer(roomId: string, playerId: string, username: string) {
    const room = this.getOrCreateRoom(roomId);
    // 参加処理と初期化をドメインロジックに委譲
    addPlayerToRoom(room, playerId, username);
  }

  removePlayer(playerId: string) {
    const now = Date.now();
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.players[playerId]) {
        // 退出処理とペナルティ判定をドメインロジックに委譲
        const result = removePlayerFromRoom(room, playerId, now);

        if (result.surrendered) {
          this.logger.log(
            `Player ${playerId} disconnected and surrendered in room ${roomId}`,
          );
        } else {
          this.logger.log(`Player ${playerId} removed from room ${roomId}`);
        }

        // 全員退出時はルームを破棄
        if (result.isEmpty) {
          this.stopGameLoop(roomId);
          this.rooms.delete(roomId);
          this.logger.log(`Room ${roomId} deleted because it is empty`);
        }
      }
    }
  }

  startGameLoop(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room || room.timerId) return;

    room.phase = 'playing';
    room.startedAt = Date.now();

    room.timerId = setInterval(() => {
      this.updateGame(room);
    }, 1000 / 30);

    this.logger.log(`Game loop started for room: ${roomId}`);
  }

  private updateGame(room: GameSession) {
    room.serverTick++;
    const now = Date.now();

    // 1. 移動と衝突判定
    updatePlayerMovements(room);

    // 2. 爆弾の爆発とダメージ計算
    const explosionResults = processExplosions(room, now);

    // 爆発イベントの送信
    for (const res of explosionResults) {
      this.server.to(room.roomId).emit('bomb:explode', {
        bombId: res.bombId,
        affectedTiles: res.affectedTiles,
        destroyedBlocks: res.destroyedBlocks,
        damagedPlayerIds: res.damagedPlayerIds,
        mapRevision: room.mapRevision,
      });
    }

    // 状態の同期
    this.server.to(room.roomId).emit('game:state', {
      serverTick: room.serverTick,
      serverTime: now,
      mapRevision: room.mapRevision,
      players: room.players,
      bombs: room.bombs,
    });

    // 3. 勝敗判定
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

  stopGameLoop(roomId: string) {
    const room = this.rooms.get(roomId);
    if (room && room.timerId) {
      clearInterval(room.timerId);
      room.timerId = undefined;
      this.logger.log(`Game loop stopped for room: ${roomId}`);
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

    // 爆弾設置のバリデーションをドメインロジックに委譲
    const bomb = tryPlaceBomb(room, playerId, Date.now());

    // 設置成功時のみクライアントへブロードキャスト
    if (bomb) {
      this.server.to(roomId).emit('bomb:spawn', { bomb });
    }
  }
}

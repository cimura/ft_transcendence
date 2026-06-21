import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import {
  GamePhase,
  TileType,
  PlayerSnapshot,
  BombSnapshot,
  Direction,
} from '@ft_transcendence/shared/game-events.types';

interface GameSession {
  roomId: string;
  phase: GamePhase;
  mapRevision: number;
  map: TileType[][];
  players: Record<string, PlayerSnapshot>;
  bombs: Record<string, BombSnapshot>;
  serverTick: number;
  timerId?: NodeJS.Timeout;
  playerInputs: Record<string, { direction: Direction | null; seq: number }>;
}

@Injectable()
export class GameService {
  private static readonly brand = 'GameService';
  private readonly logger = new Logger(GameService.brand);

  // サーバーのメモリ上で全ルームを保持
  private rooms = new Map<string, GameSession>();

  // WebSocketのServerインスタンスをGatewayから注入してもらう
  private server: Server;

  setServer(server: Server) {
    this.server = server;
  }

  // ルームの取得または新規作成
  getOrCreateRoom(roomId: string): GameSession {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        roomId,
        phase: 'waiting',
        mapRevision: 1,
        map: this.createInitialMap(), // 11x11などのグリッドマップ生成
        players: {},
        bombs: {},
        serverTick: 0,
        playerInputs: {},
      };
      this.rooms.set(roomId, room);
      this.logger.log(`Room created: ${roomId}`);
    }
    return room;
  }

  // プレイヤーの追加
  addPlayer(roomId: string, playerId: string, username: string) {
    const room = this.getOrCreateRoom(roomId);
    room.players[playerId] = {
      id: playerId,
      username,
      position: { x: 1.0, z: 1.0 }, // 初期座標（3D空間のX/Z）
      direction: 'down',
      alive: true,
      score: 0,
      color: '#FF0000',
      visorColor: '#00FFFF',
    };
  }

  // ゲームループの開始（30fps = 約33.3ms）
  startGameLoop(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room || room.timerId) return;

    room.phase = 'playing';

    // 30fps でループを回す
    room.timerId = setInterval(() => {
      this.updateGame(room);
    }, 1000 / 30);

    this.logger.log(`Game loop started for room: ${roomId}`);
  }

  // 1物理フレーム（Tick）ごとの更新ロジック
  private updateGame(room: GameSession) {
    room.serverTick++;

    // 【ステップ2の処理】プレイヤーの位置更新（後述）
    this.processPlayerMovement(room);

    // 全クライアントへ現在の全状態をブロードキャスト (30回/秒)
    this.server.to(room.roomId).emit('game:state', {
      serverTick: room.serverTick,
      serverTime: Date.now(),
      mapRevision: room.mapRevision,
      players: room.players,
      bombs: room.bombs,
    });
  }

  // ルーム解体時やエラー時にタイマーをクリア（メモリリーク対策）
  stopGameLoop(roomId: string) {
    const room = this.rooms.get(roomId);
    if (room && room.timerId) {
      clearInterval(room.timerId);
      room.timerId = undefined;
      this.logger.log(`Game loop stopped for room: ${roomId}`);
    }
  }

  private createInitialMap(): TileType[][] {
    // 簡易的な 5x5 マップ（外枠だけ壁のイメージ）
    return [
      ['solid', 'solid', 'solid', 'solid', 'solid'],
      ['solid', 'empty', 'empty', 'breakable', 'solid'],
      ['solid', 'empty', 'solid', 'empty', 'solid'],
      ['solid', 'breakable', 'empty', 'empty', 'solid'],
      ['solid', 'solid', 'solid', 'solid', 'solid'],
    ];
  }

  // src/game/game-room.service.ts 内にメソッドを追加

  private processPlayerMovement(room: GameSession) {
    const MOVE_SPEED = 0.1; // 1フレームあたりの移動量

    for (const playerId in room.players) {
      const player = room.players[playerId];
      if (!player.alive) continue;

      const input = room.playerInputs?.[playerId];
      if (!input || !input.direction) continue;

      // 入力方向に応じて3D空間（X/Z平面）の座標を更新
      switch (input.direction) {
        case 'up':
          player.position.z -= MOVE_SPEED; // Three.jsでは通常奥がマイナスZ
          player.direction = 'up';
          break;
        case 'down':
          player.position.z += MOVE_SPEED;
          player.direction = 'down';
          break;
        case 'left':
          player.position.x -= MOVE_SPEED;
          player.direction = 'left';
          break;
        case 'right':
          player.position.x += MOVE_SPEED;
          player.direction = 'right';
          break;
      }
    }
  }

  // 外部（Gateway）から入力を流し込むためのメソッド
  handlePlayerInput(
    roomId: string,
    playerId: string,
    direction: Direction | null,
    seq: number,
  ) {
    const room = this.rooms.get(roomId);
    if (!room || room.phase !== 'playing') return;

    if (!room.playerInputs) room.playerInputs = {};

    // 最新の入力キー状態とシーケンス番号を上書き保存
    room.playerInputs[playerId] = { direction, seq };
  }
}

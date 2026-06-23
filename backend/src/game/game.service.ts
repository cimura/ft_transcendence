import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import {
  GamePhase,
  TileType,
  PlayerSnapshot,
  BombSnapshot,
  Direction,
  GridPosition,
} from '@ft_transcendence/shared/game-events.types';

export interface PlayerStats {
  blocksDestroyed: number;
  bombsPlaced: number;
  kills: number;
  survivalTime: number;
}

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
  bombPassingPlayers: Record<string, string[]>;
  stats: Record<string, PlayerStats>;
  startedAt?: number;
}

@Injectable()
export class GameService {
  private static readonly brand = 'GameService';
  private readonly logger = new Logger(GameService.brand);

  private rooms = new Map<string, GameSession>();
  private server: Server;

  // 9x9マップ用の初期位置
  private readonly startPositions = [
    { x: 0, z: 0 },
    { x: 8, z: 8 },
    { x: 8, z: 0 },
    { x: 0, z: 8 },
  ];

  private readonly playerColors = [
    { color: '#ff8800', visorColor: '#00ff00' },
    { color: '#2563eb', visorColor: '#00ffff' },
    { color: '#dc2626', visorColor: '#ffff00' },
    { color: '#16a34a', visorColor: '#ff00ff' },
  ];

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
        map: this.createInitialMap(),
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

    const playerIndex = Object.keys(room.players).length % 4;
    const position = this.startPositions[playerIndex];
    const colors = this.playerColors[playerIndex];

    room.players[playerId] = {
      id: playerId,
      username,
      position: { x: position.x, z: position.z },
      direction: 'down',
      alive: true,
      score: 0,
      color: colors.color,
      visorColor: colors.visorColor,
    };
    room.stats[playerId] = {
      blocksDestroyed: 0,
      bombsPlaced: 0,
      kills: 0,
      survivalTime: 0,
    };
  }

  removePlayer(playerId: string) {
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.players[playerId]) {
        if (room.phase === 'playing') {
          // ★試合中の切断：自爆（死亡）扱いにして勝敗判定に委ねる
          room.players[playerId].alive = false;
          room.stats[playerId].survivalTime =
            Date.now() - (room.startedAt || Date.now());
          this.logger.log(
            `Player ${playerId} disconnected and surrendered in room ${roomId}`,
          );

          if (room.playerInputs) {
            delete room.playerInputs[playerId];
          }
        } else {
          // ★待機中の切断：単に部屋から退室させる
          delete room.players[playerId];
          this.logger.log(`Player ${playerId} removed from room ${roomId}`);

          if (room.playerInputs) {
            delete room.playerInputs[playerId];
          }

          // 待機中に全員いなくなったら部屋を破棄
          if (Object.keys(room.players).length === 0) {
            this.stopGameLoop(roomId);
            this.rooms.delete(roomId);
            this.logger.log(`Room ${roomId} deleted because it is empty`);
          }
        }

        // 爆弾すり抜けリストからの除外（共通処理）
        if (room.bombPassingPlayers) {
          for (const bombId in room.bombPassingPlayers) {
            room.bombPassingPlayers[bombId] = room.bombPassingPlayers[
              bombId
            ].filter((id) => id !== playerId);
          }
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

    this.processPlayerMovement(room);
    this.processBombs(room);

    this.server.to(room.roomId).emit('game:state', {
      serverTick: room.serverTick,
      serverTime: Date.now(),
      mapRevision: room.mapRevision,
      players: room.players,
      bombs: room.bombs,
    });

    this.checkGameEnd(room);
  }

  private checkGameEnd(room: GameSession) {
    if (room.phase !== 'playing') return;

    const totalPlayers = Object.keys(room.players).length;
    if (totalPlayers === 0) return;

    const livingPlayers = Object.values(room.players).filter((p) => p.alive);

    const isGameOver =
      totalPlayers >= 2
        ? livingPlayers.length <= 1
        : livingPlayers.length === 0;

    if (isGameOver) {
      room.phase = 'ended';
      this.stopGameLoop(room.roomId);

      let winnerId: string | null = null;
      let isDraw = false;

      if (livingPlayers.length === 1) {
        winnerId = livingPlayers[0].id;
      } else if (livingPlayers.length === 0) {
        isDraw = true;
      }

      livingPlayers.forEach((p) => {
        room.stats[p.id].survivalTime =
          Date.now() - (room.startedAt || Date.now());
      });

      const rankings = Object.keys(room.players).map((id) => ({
        playerId: id,
        stats: room.stats[id],
      }));

      this.server.to(room.roomId).emit('game:end', {
        winnerId,
        isDraw,
        rankings,
      });

      this.rooms.delete(room.roomId);
      this.logger.log(`Room ${room.roomId} deleted after game end`);
    }
  }

  stopGameLoop(roomId: string) {
    const room = this.rooms.get(roomId);
    if (room && room.timerId) {
      clearInterval(room.timerId);
      room.timerId = undefined;
      this.logger.log(`Game loop stopped for room: ${roomId}`);
    }
  }

  private createInitialMap(): TileType[][] {
    const MAP_PATTERN = [
      '.........',
      '.#x#x#x#.',
      '..x...x..',
      '.#x#.#x#.',
      '...x.x...',
      '.#x#.#x#.',
      '..x...x..',
      '.#x#x#x#.',
      '.........',
    ];

    const SPAWN_SAFE_RADIUS = 1;
    const DENSITY_X_WEIGHT = 13;
    const DENSITY_Y_WEIGHT = 17;
    const DENSITY_DIAGONAL_WEIGHT = 7;
    const DENSITY_BUCKET_COUNT = 10;
    const DENSITY_BREAKABLE_THRESHOLD = 5;

    return MAP_PATTERN.map(
      (row, y) =>
        [...row].map((tile, x) => {
          if (tile === '#') return 'solid';

          const isSpawnSafe = this.startPositions.some(
            (position) =>
              Math.abs(x - position.x) <= SPAWN_SAFE_RADIUS &&
              Math.abs(y - position.z) <= SPAWN_SAFE_RADIUS,
          );
          if (isSpawnSafe) return 'empty';
          if (tile === 'x') {
            return 'breakable';
          }

          const deterministicDensity =
            (x * DENSITY_X_WEIGHT +
              y * DENSITY_Y_WEIGHT +
              x * y * DENSITY_DIAGONAL_WEIGHT) %
            DENSITY_BUCKET_COUNT;
          return deterministicDensity < DENSITY_BREAKABLE_THRESHOLD
            ? 'breakable'
            : 'empty';
        }) as TileType[],
    );
  }

  private isPassable(
    room: GameSession,
    x: number,
    y: number,
    playerId: string,
  ): boolean {
    if (y < 0 || y >= room.map.length || x < 0 || x >= room.map[0].length)
      return false;
    if (room.map[y][x] !== 'empty') return false;

    for (const bomb of Object.values(room.bombs)) {
      if (bomb.position.x === x && bomb.position.y === y) {
        const passingPlayers = room.bombPassingPlayers?.[bomb.id] || [];
        if (passingPlayers.includes(playerId)) {
          continue;
        }
        return false;
      }
    }
    return true;
  }

  private processPlayerMovement(room: GameSession) {
    const MOVE_SPEED = 0.1;
    const COLLISION_SIZE = 0.3;

    for (const playerId in room.players) {
      const player = room.players[playerId];
      if (!player.alive) continue;

      const input = room.playerInputs?.[playerId];
      if (!input || !input.direction) continue;

      let dx = 0;
      let dz = 0;

      switch (input.direction) {
        case 'up':
          dz -= MOVE_SPEED;
          player.direction = 'up';
          break;
        case 'down':
          dz += MOVE_SPEED;
          player.direction = 'down';
          break;
        case 'left':
          dx -= MOVE_SPEED;
          player.direction = 'left';
          break;
        case 'right':
          dx += MOVE_SPEED;
          player.direction = 'right';
          break;
      }

      const nextX = player.position.x + dx;
      const nextZ = player.position.z + dz;

      const checkCollision = (nx: number, nz: number) => {
        const left = Math.floor(nx - COLLISION_SIZE + 0.5);
        const right = Math.floor(nx + COLLISION_SIZE + 0.5);
        const top = Math.floor(nz - COLLISION_SIZE + 0.5);
        const bottom = Math.floor(nz + COLLISION_SIZE + 0.5);

        for (let y = top; y <= bottom; y++) {
          for (let x = left; x <= right; x++) {
            if (!this.isPassable(room, x, y, playerId)) return true;
          }
        }
        return false;
      };

      if (!checkCollision(nextX, player.position.z)) {
        player.position.x = nextX;
      }
      if (!checkCollision(player.position.x, nextZ)) {
        player.position.z = nextZ;
      }

      const currentLeft = Math.floor(player.position.x - COLLISION_SIZE + 0.5);
      const currentRight = Math.floor(player.position.x + COLLISION_SIZE + 0.5);
      const currentTop = Math.floor(player.position.z - COLLISION_SIZE + 0.5);
      const currentBottom = Math.floor(
        player.position.z + COLLISION_SIZE + 0.5,
      );

      for (const bombId in room.bombPassingPlayers) {
        const passingPlayers = room.bombPassingPlayers[bombId];
        if (passingPlayers.includes(playerId)) {
          const bomb = room.bombs[bombId];
          if (!bomb) continue;

          let isOverlapping = false;
          for (let y = currentTop; y <= currentBottom; y++) {
            for (let x = currentLeft; x <= currentRight; x++) {
              if (bomb.position.x === x && bomb.position.y === y) {
                isOverlapping = true;
              }
            }
          }

          if (!isOverlapping) {
            room.bombPassingPlayers[bombId] = passingPlayers.filter(
              (id) => id !== playerId,
            );
          }
        }
      }
    }
  }

  private processBombs(room: GameSession) {
    const now = Date.now();
    const explodedBombs: BombSnapshot[] = [];

    for (const bombId in room.bombs) {
      if (room.bombs[bombId].explodesAt <= now) {
        explodedBombs.push(room.bombs[bombId]);
        delete room.bombs[bombId];
        if (room.bombPassingPlayers) {
          delete room.bombPassingPlayers[bombId];
        }
      }
    }

    for (const bomb of explodedBombs) {
      const affectedTiles: GridPosition[] = [
        { x: bomb.position.x, y: bomb.position.y },
      ];
      const destroyedBlocks: GridPosition[] = [];
      const damagedPlayerIds: string[] = [];

      const directions = [
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 },
      ];

      for (const dir of directions) {
        for (let i = 1; i <= bomb.blastRange; i++) {
          const cx = bomb.position.x + dir.dx * i;
          const cy = bomb.position.y + dir.dy * i;

          if (
            cy < 0 ||
            cy >= room.map.length ||
            cx < 0 ||
            cx >= room.map[0].length
          )
            break;

          const tile = room.map[cy][cx];
          if (tile === 'solid') break;

          affectedTiles.push({ x: cx, y: cy });

          if (tile === 'breakable') {
            room.map[cy][cx] = 'empty';
            destroyedBlocks.push({ x: cx, y: cy });
            break;
          }
        }
      }

      if (destroyedBlocks.length > 0) {
        room.mapRevision++;
        room.stats[bomb.ownerId].blocksDestroyed += destroyedBlocks.length;
      }

      for (const playerId in room.players) {
        const p = room.players[playerId];
        if (!p.alive) continue;
        const px = Math.round(p.position.x);
        const py = Math.round(p.position.z);

        if (affectedTiles.some((t) => t.x === px && t.y === py)) {
          p.alive = false;
          damagedPlayerIds.push(playerId);

          if (bomb.ownerId !== playerId) {
            room.stats[bomb.ownerId].kills++;
          }
          room.stats[playerId].survivalTime =
            Date.now() - (room.startedAt || Date.now());
        }
      }

      this.server.to(room.roomId).emit('bomb:explode', {
        bombId: bomb.id,
        affectedTiles,
        destroyedBlocks,
        damagedPlayerIds,
        mapRevision: room.mapRevision,
      });
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

    const player = room.players[playerId];
    if (!player || !player.alive) return;

    const activeBombs = Object.values(room.bombs).filter(
      (b) => b.ownerId === playerId,
    ).length;
    if (activeBombs >= 1) return;

    const gridX = Math.round(player.position.x);
    const gridY = Math.round(player.position.z);

    if (
      Object.values(room.bombs).some(
        (b) => b.position.x === gridX && b.position.y === gridY,
      )
    ) {
      return;
    }

    const bombId = `bomb_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const bomb: BombSnapshot = {
      id: bombId,
      ownerId: playerId,
      position: { x: gridX, y: gridY },
      explodesAt: Date.now() + 3000,
      blastRange: 2,
    };

    room.bombs[bombId] = bomb;
    room.stats[playerId].bombsPlaced++;
    if (!room.bombPassingPlayers) room.bombPassingPlayers = {};
    room.bombPassingPlayers[bombId] = [playerId];

    this.server.to(roomId).emit('bomb:spawn', { bomb });
  }
}

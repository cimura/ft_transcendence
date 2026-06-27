import { GameSession } from '../game.types';
import { getPlayersOverlappingTile } from './movement.logic';
import type {
  GridPosition,
  BombSnapshot,
} from '@ft_transcendence/shared/game-events.types';
import {
  BOMB_EXPLOSION_TIME_MS,
  DEFAULT_MAX_BOMBS,
  DEFAULT_BOMB_RANGE,
} from '../constants/game-constants';

export interface ExplosionResult {
  bombId: string;
  affectedTiles: GridPosition[];
  destroyedBlocks: GridPosition[];
  damagedPlayerIds: string[];
}

export function processExplosions(
  room: GameSession,
  now: number,
): ExplosionResult[] {
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

  const results: ExplosionResult[] = [];

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
        ) {
          break;
        }

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
        room.stats[playerId].survivalTime = now - (room.startedAt || now);
      }
    }

    results.push({
      bombId: bomb.id,
      affectedTiles,
      destroyedBlocks,
      damagedPlayerIds,
    });
  }

  return results;
}

export function tryPlaceBomb(
  room: GameSession,
  playerId: string,
  now: number,
): BombSnapshot | null {
  if (room.phase !== 'playing') return null;

  const player = room.players[playerId];
  if (!player || !player.alive) return null;

  const activeBombs = Object.values(room.bombs).filter(
    (b) => b.ownerId === playerId,
  ).length;

  if (activeBombs >= DEFAULT_MAX_BOMBS) return null;

  const gridX = Math.round(player.position.x);
  const gridY = Math.round(player.position.z);

  if (
    Object.values(room.bombs).some(
      (b) => b.position.x === gridX && b.position.y === gridY,
    )
  ) {
    return null;
  }

  const bombId = `bomb_${now}_${Math.random().toString(36).substring(2, 9)}`;
  const bomb: BombSnapshot = {
    id: bombId,
    ownerId: playerId,
    position: { x: gridX, y: gridY },
    explodesAt: now + BOMB_EXPLOSION_TIME_MS,
    blastRange: DEFAULT_BOMB_RANGE,
  };

  room.bombs[bombId] = bomb;
  room.stats[playerId].bombsPlaced++;
  if (!room.bombPassingPlayers) room.bombPassingPlayers = {};

  room.bombPassingPlayers[bombId] = getPlayersOverlappingTile(
    room,
    gridX,
    gridY,
  );

  return bomb;
}

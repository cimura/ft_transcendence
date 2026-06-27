import { GameSession } from '../game.types';
import {
  PLAYER_MOVE_SPEED,
  PLAYER_COLLISION_SIZE,
} from '../constants/game-constants';

export function isPassable(
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

export function getPlayersOverlappingTile(
  room: GameSession,
  gridX: number,
  gridY: number,
): string[] {
  const passingPlayers: string[] = [];

  for (const pid in room.players) {
    const p = room.players[pid];
    if (!p.alive) continue;

    const currentLeft = Math.floor(p.position.x - PLAYER_COLLISION_SIZE + 0.5);
    const currentRight = Math.floor(p.position.x + PLAYER_COLLISION_SIZE + 0.5);
    const currentTop = Math.floor(p.position.z - PLAYER_COLLISION_SIZE + 0.5);
    const currentBottom = Math.floor(
      p.position.z + PLAYER_COLLISION_SIZE + 0.5,
    );

    let isOverlapping = false;
    for (let y = currentTop; y <= currentBottom; y++) {
      for (let x = currentLeft; x <= currentRight; x++) {
        if (gridX === x && gridY === y) {
          isOverlapping = true;
        }
      }
    }

    if (isOverlapping) {
      passingPlayers.push(pid);
    }
  }

  return passingPlayers;
}

export function updatePlayerMovements(room: GameSession): void {
  for (const playerId in room.players) {
    const player = room.players[playerId];
    if (!player.alive) continue;

    const input = room.playerInputs?.[playerId];
    if (!input || !input.direction) continue;

    let dx = 0;
    let dz = 0;

    switch (input.direction) {
      case 'up':
        dz -= PLAYER_MOVE_SPEED;
        player.direction = 'up';
        break;
      case 'down':
        dz += PLAYER_MOVE_SPEED;
        player.direction = 'down';
        break;
      case 'left':
        dx -= PLAYER_MOVE_SPEED;
        player.direction = 'left';
        break;
      case 'right':
        dx += PLAYER_MOVE_SPEED;
        player.direction = 'right';
        break;
    }

    const nextX = player.position.x + dx;
    const nextZ = player.position.z + dz;

    const checkCollision = (nx: number, nz: number) => {
      const left = Math.floor(nx - PLAYER_COLLISION_SIZE + 0.5);
      const right = Math.floor(nx + PLAYER_COLLISION_SIZE + 0.5);
      const top = Math.floor(nz - PLAYER_COLLISION_SIZE + 0.5);
      const bottom = Math.floor(nz + PLAYER_COLLISION_SIZE + 0.5);

      for (let y = top; y <= bottom; y++) {
        for (let x = left; x <= right; x++) {
          if (!isPassable(room, x, y, playerId)) return true;
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

    const currentLeft = Math.floor(
      player.position.x - PLAYER_COLLISION_SIZE + 0.5,
    );
    const currentRight = Math.floor(
      player.position.x + PLAYER_COLLISION_SIZE + 0.5,
    );
    const currentTop = Math.floor(
      player.position.z - PLAYER_COLLISION_SIZE + 0.5,
    );
    const currentBottom = Math.floor(
      player.position.z + PLAYER_COLLISION_SIZE + 0.5,
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

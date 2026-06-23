import { TileType } from '@ft_transcendence/shared/game-events.types';

export const START_POSITIONS = [
  { x: 0, z: 0 },
  { x: 8, z: 8 },
  { x: 8, z: 0 },
  { x: 0, z: 8 },
];

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

export function createInitialMap(): TileType[][] {
  return MAP_PATTERN.map(
    (row, y) =>
      [...row].map((tile, x) => {
        if (tile === '#') return 'solid';

        // 初期位置の周辺一マスを安全地帯（空き地）にする
        const isSpawnSafe = START_POSITIONS.some(
          (position) =>
            Math.abs(x - position.x) <= SPAWN_SAFE_RADIUS &&
            Math.abs(y - position.z) <= SPAWN_SAFE_RADIUS,
        );
        if (isSpawnSafe) return 'empty';
        if (tile === 'x') return 'breakable';

        // 決定論的な擬似乱数による障害物の配置
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

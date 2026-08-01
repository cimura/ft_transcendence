import type { TileType, WorldPosition } from './game-events.types';
import { BOMBERMAN_GRID_SIZE, MAP_PATTERN } from './game-constants';

/**
 * マップ生成のファイル
 *
 * 生成は完全に決定論的なので、サーバーとクライアントが同じ入力から
 * 同じマップを得られる。待機中のプレビュー描画もこの関数を直接呼ぶ。
 */

export const START_POSITIONS: WorldPosition[] = [
  { x: 0, z: 0 },
  { x: BOMBERMAN_GRID_SIZE - 1, z: BOMBERMAN_GRID_SIZE - 1 },
  { x: BOMBERMAN_GRID_SIZE - 1, z: 0 },
  { x: 0, z: BOMBERMAN_GRID_SIZE - 1 },
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

import { BOMBERMAN_GRID_SIZE } from '@ft_transcendence/shared/game-constants'

const BREAKABLE_COLOR_X_WEIGHT = 7
const BREAKABLE_COLOR_Y_WEIGHT = 11

export const BREAKABLE_COLORS = [
  '#00ffff',
  '#ff00ff',
  '#ffff00',
  '#00ff88',
  '#ff5500',
]

export const getBreakableColor = (x: number, y: number) => {
  if (
    x < 0 ||
    x >= BOMBERMAN_GRID_SIZE ||
    y < 0 ||
    y >= BOMBERMAN_GRID_SIZE ||
    isNaN(x) ||
    isNaN(y)
  ) {
    return BREAKABLE_COLORS[0]
  }

  return BREAKABLE_COLORS[
    (x * BREAKABLE_COLOR_X_WEIGHT + y * BREAKABLE_COLOR_Y_WEIGHT) %
      BREAKABLE_COLORS.length
  ]
}

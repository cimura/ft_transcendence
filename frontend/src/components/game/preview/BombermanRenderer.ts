import type {
  TileType,
  WorldPosition,
} from '@ft_transcendence/shared/game-events.types'

// マップのプレビューを描画するためのファイル

type RenderBombermanSceneOptions = {
  ctx: CanvasRenderingContext2D
  map: TileType[][]
  spawnPositions: readonly WorldPosition[]
  tileSize: number
}

const colors = {
  floor: '#111827',
  floorAlt: '#1f2937',
  solid: '#4b5563',
  solidHighlight: '#6b7280',
  breakable: '#b45309',
  breakableHighlight: '#d97706',
  grid: 'rgba(255, 255, 255, 0.08)',
  spawnMarker: 'rgba(34, 211, 238, 0.85)',
}

const CHECKER_PATTERN_MODULO = 2
const FULL_CIRCLE_RADIANS = Math.PI * 2
const TILE_CENTER_DIVISOR = 2
const SOLID_BLOCK_INSET = 3
const SOLID_HIGHLIGHT_INSET = 7
const SOLID_HIGHLIGHT_TRIM = 14
const SOLID_HIGHLIGHT_HEIGHT = 5
const BREAKABLE_BLOCK_INSET = 5
const BREAKABLE_BLOCK_TRIM = 10
const BREAKABLE_HIGHLIGHT_INSET = 9
const BREAKABLE_HIGHLIGHT_TRIM = 18
const BREAKABLE_HIGHLIGHT_HEIGHT = 4
const BREAKABLE_BOTTOM_HIGHLIGHT_OFFSET = 13
const GRID_LINE_WIDTH = 1
const GRID_PIXEL_OFFSET = 0.5
const SPAWN_MARKER_RADIUS_RATIO = 0.32
const SPAWN_MARKER_LINE_WIDTH = 2

export function renderBombermanScene({
  ctx,
  map,
  spawnPositions,
  tileSize,
}: RenderBombermanSceneOptions) {
  const rows = map.length
  const cols = map[0]?.length ?? 0

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.fillStyle = colors.floor
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const tile = map[y][x]
      const left = x * tileSize
      const top = y * tileSize

      ctx.fillStyle =
        (x + y) % CHECKER_PATTERN_MODULO === 0 ? colors.floor : colors.floorAlt
      ctx.fillRect(left, top, tileSize, tileSize)

      if (tile === 'solid') {
        ctx.fillStyle = colors.solid
        ctx.fillRect(
          left + SOLID_BLOCK_INSET,
          top + SOLID_BLOCK_INSET,
          tileSize - SOLID_BLOCK_INSET * TILE_CENTER_DIVISOR,
          tileSize - SOLID_BLOCK_INSET * TILE_CENTER_DIVISOR
        )
        ctx.fillStyle = colors.solidHighlight
        ctx.fillRect(
          left + SOLID_HIGHLIGHT_INSET,
          top + SOLID_HIGHLIGHT_INSET,
          tileSize - SOLID_HIGHLIGHT_TRIM,
          SOLID_HIGHLIGHT_HEIGHT
        )
      }

      if (tile === 'breakable') {
        ctx.fillStyle = colors.breakable
        ctx.fillRect(
          left + BREAKABLE_BLOCK_INSET,
          top + BREAKABLE_BLOCK_INSET,
          tileSize - BREAKABLE_BLOCK_TRIM,
          tileSize - BREAKABLE_BLOCK_TRIM
        )
        ctx.fillStyle = colors.breakableHighlight
        ctx.fillRect(
          left + BREAKABLE_HIGHLIGHT_INSET,
          top + BREAKABLE_HIGHLIGHT_INSET,
          tileSize - BREAKABLE_HIGHLIGHT_TRIM,
          BREAKABLE_HIGHLIGHT_HEIGHT
        )
        ctx.fillRect(
          left + BREAKABLE_HIGHLIGHT_INSET,
          top + tileSize - BREAKABLE_BOTTOM_HIGHLIGHT_OFFSET,
          tileSize - BREAKABLE_HIGHLIGHT_TRIM,
          BREAKABLE_HIGHLIGHT_HEIGHT
        )
      }

      ctx.strokeStyle = colors.grid
      ctx.lineWidth = GRID_LINE_WIDTH
      ctx.strokeRect(
        left + GRID_PIXEL_OFFSET,
        top + GRID_PIXEL_OFFSET,
        tileSize,
        tileSize
      )
    }
  }

  // スポーン候補地点を中立なリングで示す（誰がどこに出るかはゲーム開始まで伏せる）
  spawnPositions.forEach((position) => {
    const centerX = position.x * tileSize + tileSize / TILE_CENTER_DIVISOR
    const centerY = position.z * tileSize + tileSize / TILE_CENTER_DIVISOR
    const radius = tileSize * SPAWN_MARKER_RADIUS_RATIO

    ctx.strokeStyle = colors.spawnMarker
    ctx.lineWidth = SPAWN_MARKER_LINE_WIDTH
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, FULL_CIRCLE_RADIANS)
    ctx.stroke()
  })
}

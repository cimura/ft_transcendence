import type { BombermanMap, BombermanPlayerPreview } from './bombermanTypes'

type RenderBombermanSceneOptions = {
  ctx: CanvasRenderingContext2D
  map: BombermanMap
  players: BombermanPlayerPreview[]
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
  text: '#f9fafb',
}

export function renderBombermanScene({
  ctx,
  map,
  players,
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

      ctx.fillStyle = (x + y) % 2 === 0 ? colors.floor : colors.floorAlt
      ctx.fillRect(left, top, tileSize, tileSize)

      if (tile === 'solid') {
        ctx.fillStyle = colors.solid
        ctx.fillRect(left + 3, top + 3, tileSize - 6, tileSize - 6)
        ctx.fillStyle = colors.solidHighlight
        ctx.fillRect(left + 7, top + 7, tileSize - 14, 5)
      }

      if (tile === 'breakable') {
        ctx.fillStyle = colors.breakable
        ctx.fillRect(left + 5, top + 5, tileSize - 10, tileSize - 10)
        ctx.fillStyle = colors.breakableHighlight
        ctx.fillRect(left + 9, top + 9, tileSize - 18, 4)
        ctx.fillRect(left + 9, top + tileSize - 13, tileSize - 18, 4)
      }

      ctx.strokeStyle = colors.grid
      ctx.lineWidth = 1
      ctx.strokeRect(left + 0.5, top + 0.5, tileSize, tileSize)
    }
  }

  players.forEach((player) => {
    const centerX = player.gridX * tileSize + tileSize / 2
    const centerY = player.gridY * tileSize + tileSize / 2
    const radius = tileSize * 0.32

    ctx.fillStyle = player.color
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.beginPath()
    ctx.arc(centerX - radius * 0.35, centerY - radius * 0.25, 3, 0, Math.PI * 2)
    ctx.arc(centerX + radius * 0.35, centerY - radius * 0.25, 3, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = colors.text
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(player.username, centerX, centerY + tileSize * 0.7)
  })
}

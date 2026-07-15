import { useEffect, useMemo, useRef } from 'react'
import { createInitialBombermanMap, initialPlayers } from './map-mock'
import { renderBombermanScene } from './BombermanRenderer'

// TODO: 部屋にいるときにマップ情報を取得して表示できるようにする (現状map-mockを使用)
// (現在はゲームがスタートしてからサーバーからマップが送られてくるので表示できない)

const PREVIEW_TILE_SIZE = 40
const MAX_PREVIEW_SCALE = 1

export function GameMapPreview() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const map = useMemo(() => createInitialBombermanMap(), [])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const mapWidth = (map[0]?.length ?? 0) * PREVIEW_TILE_SIZE
    const mapHeight = map.length * PREVIEW_TILE_SIZE

    const drawPreview = () => {
      const containerWidth = container.clientWidth
      const scale = Math.min(containerWidth / mapWidth, MAX_PREVIEW_SCALE)

      canvas.width = mapWidth
      canvas.height = mapHeight
      canvas.style.width = `${mapWidth * scale}px`
      canvas.style.height = `${mapHeight * scale}px`

      renderBombermanScene({
        ctx,
        map,
        players: initialPlayers,
        tileSize: PREVIEW_TILE_SIZE,
      })
    }

    const observer = new ResizeObserver(drawPreview)
    observer.observe(container)
    drawPreview()

    return () => {
      observer.disconnect()
    }
  }, [map])

  return (
    <div
      ref={containerRef}
      className="flex min-h-[220px] items-center justify-center overflow-hidden rounded-md bg-gray-950 p-3"
    >
      <canvas
        ref={canvasRef}
        className="max-w-full rounded border border-gray-700 bg-gray-900"
      />
    </div>
  )
}

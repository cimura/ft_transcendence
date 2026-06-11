import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  BOMBERMAN_TILE_SIZE,
  createInitialBombermanMap,
  initialPlayers,
} from '../../game/bomberman/bombermanMap'
import { renderBombermanScene } from '../../game/bomberman/BombermanRenderer'
import type {
  BombermanInput,
  Direction,
} from '../../game/bomberman/bombermanTypes'
import { GameLoop } from '../../game/engine/GameLoop'
import { InputManager } from '../../game/engine/InputManager'
import { TouchControls, type ActiveControl } from './TouchControls'

type GameCanvasProps = {
  onInput?: (input: BombermanInput) => void
}

export function GameCanvas({ onInput }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const map = useMemo(() => createInitialBombermanMap(), [])
  const inputManagerRef = useRef<InputManager | null>(null)
  const bombHighlightTimeoutRef = useRef<number | null>(null)
  const [activeControl, setActiveControl] = useState<ActiveControl>(null)

  const isDirection = (value: ActiveControl): value is Direction =>
    value === 'up' || value === 'down' || value === 'left' || value === 'right'

  const clearBombHighlightTimeout = useCallback(() => {
    if (bombHighlightTimeoutRef.current === null) return

    window.clearTimeout(bombHighlightTimeoutRef.current)
    bombHighlightTimeoutRef.current = null
  }, [])

  const highlightBomb = useCallback(() => {
    clearBombHighlightTimeout()
    setActiveControl('bomb')
    bombHighlightTimeoutRef.current = window.setTimeout(() => {
      setActiveControl(null)
      bombHighlightTimeoutRef.current = null
    }, 180)
  }, [clearBombHighlightTimeout])

  const handleInputState = useCallback(
    (input: BombermanInput) => {
      if (input.type === 'move') {
        clearBombHighlightTimeout()
        setActiveControl(input.direction)
        return
      }

      if (input.type === 'place_bomb') {
        highlightBomb()
        return
      }

      setActiveControl((current) => (isDirection(current) ? null : current))
    },
    [clearBombHighlightTimeout, highlightBomb]
  )

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const mapWidth = (map[0]?.length ?? 0) * BOMBERMAN_TILE_SIZE
    const mapHeight = map.length * BOMBERMAN_TILE_SIZE
    const resizeCanvas = () => {
      const containerWidth = container.clientWidth
      const scale = Math.min(containerWidth / mapWidth, 1)

      canvas.width = mapWidth
      canvas.height = mapHeight
      canvas.style.width = `${mapWidth * scale}px`
      canvas.style.height = `${mapHeight * scale}px`
    }

    const observer = new ResizeObserver(resizeCanvas)
    observer.observe(container)
    resizeCanvas()

    const loop = new GameLoop({
      update: () => undefined,
      render: () => {
        renderBombermanScene({
          ctx,
          map,
          players: initialPlayers,
          tileSize: BOMBERMAN_TILE_SIZE,
        })
      },
    })

    loop.start()

    return () => {
      loop.stop()
      observer.disconnect()
    }
  }, [map])

  useEffect(() => {
    const manager = new InputManager((input) => {
      handleInputState(input)
      onInput?.(input)
    })
    inputManagerRef.current = manager
    manager.attach()

    return () => {
      manager.detach()
      inputManagerRef.current = null
      clearBombHighlightTimeout()
    }
  }, [clearBombHighlightTimeout, handleInputState, onInput])

  const handleTouchInput = (input: BombermanInput) => {
    inputManagerRef.current?.emitTouchInput(input)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px]">
      <div
        ref={containerRef}
        className="flex min-h-[360px] items-center justify-center overflow-hidden rounded-lg bg-gray-950 p-4"
      >
        <canvas
          ref={canvasRef}
          className="max-w-full rounded-md border border-gray-700 bg-gray-900"
        />
      </div>
      <TouchControls onInput={handleTouchInput} activeControl={activeControl} />
    </div>
  )
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  BombermanGameState,
  BombermanInput,
  Direction,
} from '../../game/bomberman/bombermanTypes'
import { MockBombermanApi } from '../../game/bomberman/MockBombermanApi'
import { GameLoop } from '../../game/engine/GameLoop'
import { InputManager } from '../../game/engine/InputManager'
import { BombermanScene } from './BombermanScene'
import { TouchControls, type ActiveControl } from './TouchControls'

type GameCanvasProps = {
  onInput?: (input: BombermanInput) => void
  onStateChange?: (state: BombermanGameState) => void
}

const BOMB_HIGHLIGHT_DURATION_MS = 180

export function GameCanvas({ onInput, onStateChange }: GameCanvasProps) {
  const gameApi = useMemo(() => new MockBombermanApi(), [])
  const inputManagerRef = useRef<InputManager | null>(null)
  const bombHighlightTimeoutRef = useRef<number | null>(null)
  const [activeControl, setActiveControl] = useState<ActiveControl>(null)
  const [gameState, setGameState] = useState(() => gameApi.getSnapshot())

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
    }, BOMB_HIGHLIGHT_DURATION_MS)
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
    const loop = new GameLoop({
      update: (deltaTime) => {
        const nextState = gameApi.tick(deltaTime, performance.now())
        setGameState(nextState)
        onStateChange?.(nextState)
      },
      render: () => undefined,
    })

    loop.start()

    return () => {
      loop.stop()
    }
  }, [gameApi, onStateChange])

  useEffect(() => {
    let isActive = true
    const manager = new InputManager((input) => {
      handleInputState(input)
      void gameApi.sendInput(input).then((response) => {
        if (!isActive || !response.ok) return

        setGameState(response.state)
        onStateChange?.(response.state)
        onInput?.(response.input)
      })
    })
    inputManagerRef.current = manager
    manager.attach()

    return () => {
      isActive = false
      manager.detach()
      inputManagerRef.current = null
      clearBombHighlightTimeout()
    }
  }, [
    clearBombHighlightTimeout,
    gameApi,
    handleInputState,
    onInput,
    onStateChange,
  ])

  const handleTouchInput = (input: BombermanInput) => {
    inputManagerRef.current?.emitTouchInput(input)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px]">
      <div className="relative min-h-[560px] overflow-hidden rounded-lg border border-cyan-500/20 bg-gray-950">
        <BombermanScene gameState={gameState} />
      </div>
      <TouchControls onInput={handleTouchInput} activeControl={activeControl} />
    </div>
  )
}

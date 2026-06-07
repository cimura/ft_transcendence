import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  BombermanGameState,
  BombermanInput,
  Direction,
} from '../../game/bomberman/bombermanTypes'
import { BombermanGame } from '../../game/bomberman/BombermanGame'
import { GameLoop } from '../../game/engine/GameLoop'
import { InputManager } from '../../game/engine/InputManager'
import { BombermanScene } from './BombermanScene'
import { TouchControls, type ActiveControl } from './TouchControls'

type GameCanvasProps = {
  onInput?: (input: BombermanInput) => void
  onStateChange?: (state: BombermanGameState) => void
}

export function GameCanvas({ onInput, onStateChange }: GameCanvasProps) {
  const game = useMemo(() => new BombermanGame(), [])
  const inputManagerRef = useRef<InputManager | null>(null)
  const bombHighlightTimeoutRef = useRef<number | null>(null)
  const [activeControl, setActiveControl] = useState<ActiveControl>(null)
  const [gameState, setGameState] = useState(() => game.getSnapshot())

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
    const loop = new GameLoop({
      update: (deltaTime) => {
        const nextState = game.update(deltaTime, performance.now())
        setGameState(nextState)
        onStateChange?.(nextState)
      },
      render: () => undefined,
    })

    loop.start()

    return () => {
      loop.stop()
    }
  }, [game, onStateChange])

  useEffect(() => {
    const manager = new InputManager((input) => {
      handleInputState(input)
      game.handleInput(input)
      onInput?.(input)
    })
    inputManagerRef.current = manager
    manager.attach()

    return () => {
      manager.detach()
      inputManagerRef.current = null
      clearBombHighlightTimeout()
    }
  }, [clearBombHighlightTimeout, game, handleInputState, onInput])

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

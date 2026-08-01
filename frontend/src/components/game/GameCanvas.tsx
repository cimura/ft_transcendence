import type { RefObject } from 'react'
import type { Socket } from 'socket.io-client'
import { BombermanScene } from './BombermanScene'
import { TouchControls } from './TouchControls'
import { useGameStore } from '../../stores/gameStore'
import { useGameInput } from '../../hooks/useGameInput'
import { GameCountdownOverlay } from './GameCountdownOverlay'

type GameCanvasProps = {
  socketRef: RefObject<Socket | null>
}

export function GameCanvas({ socketRef }: GameCanvasProps) {
  const gameState = useGameStore((state) => state.gameState)
  const { activeControl, handleTouchInput } = useGameInput(socketRef)

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px]">
      <div className="relative min-h-[560px] overflow-hidden rounded-lg border border-cyan-500/20 bg-gray-950">
        <BombermanScene gameState={gameState} />
        <GameCountdownOverlay />
      </div>
      <TouchControls onInput={handleTouchInput} activeControl={activeControl} />
    </div>
  )
}

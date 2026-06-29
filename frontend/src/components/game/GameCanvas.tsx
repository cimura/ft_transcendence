import { BombermanScene } from './BombermanScene'
import { TouchControls } from './TouchControls'
import { useGameStore } from '../../stores/gameStore'
import { useGameSocket } from '../../hooks/useGameSocket'
import { useGameInput } from '../../hooks/useGameInput'
import { useGamePhaseTransition } from '../../hooks/useGamePhaseTransition'
import { GameCountdownOverlay } from './GameCountdownOverlay'

type GameCanvasProps = {
  roomId: string
}

export function GameCanvas({ roomId }: GameCanvasProps) {
  const gameState = useGameStore((state) => state.gameState)
  const socketRef = useGameSocket(roomId)
  const { activeControl, handleTouchInput } = useGameInput(socketRef)
  useGamePhaseTransition()

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

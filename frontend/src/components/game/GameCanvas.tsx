import { BombermanScene } from './BombermanScene'
import { TouchControls } from './TouchControls'
import { useGameStore } from '../../stores/gameStore'
import { useGameSocket } from '../../hooks/useGameSocket'
import { useGameInput } from '../../hooks/useGameInput'
import { GameCountdownOverlay } from './GameCountdownOverlay'

type GameCanvasProps = {
  roomId: string
}

export function GameCanvas({ roomId }: GameCanvasProps) {
  const gameState = useGameStore((state) => state.gameState)
  const socketRef = useGameSocket(roomId)
  const { activeControl, handleTouchInput } = useGameInput(socketRef)

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px]">
      <div className="relative min-h-[560px] overflow-hidden border border-emerald-200/30 bg-gray-950 shadow-[0_0_36px_rgba(53,241,193,0.12)]">
        <BombermanScene gameState={gameState} />
        <GameCountdownOverlay />
      </div>
      <TouchControls onInput={handleTouchInput} activeControl={activeControl} />
    </div>
  )
}

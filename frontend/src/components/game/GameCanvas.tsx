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
    <div className="flex h-full w-full">
      {/*変更: bg-gray-950 を bg-transparent に変更して親要素を透過 */}
      <div className="relative min-w-0 flex-1 overflow-hidden bg-transparent">
        <BombermanScene gameState={gameState} />
        <GameCountdownOverlay />
      </div>
      <div className="flex w-[180px] shrink-0 items-center justify-center p-2">
        <TouchControls
          onInput={handleTouchInput}
          activeControl={activeControl}
        />
      </div>
    </div>
  )
}
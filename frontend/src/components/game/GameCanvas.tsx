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
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_220px] items-center h-full w-full max-w-[1400px] mx-auto">
      {/* 高さを固定せず、横幅に対する比率(aspect)でスケーリングさせる */}
      <div className="relative w-full aspect-[4/3] lg:aspect-video rounded-xl border border-cyan-500/30 bg-transparent shadow-[0_0_20px_rgba(0,255,255,0.1)]">
        {/* HUD風のコーナー装飾 */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400 opacity-70 rounded-tl-lg pointer-events-none z-10" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400 opacity-70 rounded-tr-lg pointer-events-none z-10" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400 opacity-70 rounded-bl-lg pointer-events-none z-10" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400 opacity-70 rounded-br-lg pointer-events-none z-10" />

        <BombermanScene gameState={gameState} />
        <GameCountdownOverlay />
      </div>
      
      {/* コントロールパネル領域 */}
      <div className="h-full flex items-center justify-center">
        <TouchControls onInput={handleTouchInput} activeControl={activeControl} />
      </div>
    </div>
  )
}
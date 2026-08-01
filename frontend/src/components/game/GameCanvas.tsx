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
    // 全体をrelativeにして、子要素を重ね合わせられるようにする
    <div className="relative w-full h-full overflow-hidden bg-transparent">
      {/* 3Dシーン（最背面・全画面） */}
      <div className="absolute inset-0 z-0">
        <BombermanScene gameState={gameState} />
        <GameCountdownOverlay />
      </div>

      {/* コントローラー（右手前側にフロート配置・レスポンシブスケール） */}
      <div className="absolute top-4 right-4 sm:top-8 sm:right-8 z-10 pointer-events-none">
        {/* スマホ画面(小さめ)、タブレット(普通)、PC(最大)でスケールを自動調整 */}
        <div className="pointer-events-auto origin-top-right scale-75 sm:scale-90 lg:scale-100 transition-transform duration-300">
          <TouchControls
            onInput={handleTouchInput}
            activeControl={activeControl}
          />
        </div>
      </div>
    </div>
  )
}

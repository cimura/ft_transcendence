import { BombermanScene } from './BombermanScene'
import { TouchControls } from './TouchControls'
import { useGameStore } from '../../stores/gameStore'
import { useGameSocket } from '../../hooks/useGameSocket'
import { useGameInput } from '../../hooks/useGameInput'
import type {
  BombermanInput,
  GameEndPayload,
} from '../../game/bomberman/bombermanTypes'

type GameCanvasProps = {
  roomId: string
  onInput?: (input: BombermanInput) => void
  onGameEnd?: (
    result: 'WIN' | 'LOSE' | 'DRAW',
    rankings?: GameEndPayload['rankings']
  ) => void
}

export function GameCanvas({ roomId, onInput, onGameEnd }: GameCanvasProps) {
  const gameState = useGameStore((state) => state.gameState)

  // 1. 通信・状態同期のロジックを切り出したカスタムフック
  const socketRef = useGameSocket(roomId, onGameEnd)

  // 2. 入力管理・送信のロジックを切り出したカスタムフック
  const { activeControl, handleTouchInput } = useGameInput(socketRef, onInput)

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px]">
      <div className="relative min-h-[560px] overflow-hidden rounded-lg border border-cyan-500/20 bg-gray-950">
        <BombermanScene gameState={gameState} />
      </div>
      <TouchControls onInput={handleTouchInput} activeControl={activeControl} />
    </div>
  )
}

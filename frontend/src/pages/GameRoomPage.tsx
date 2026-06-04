import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { GameCanvas } from '../components/game/GameCanvas'
import { useLobbyStore } from '../stores/lobbyStore'
import type { BombermanInput } from '../game/bomberman/bombermanTypes'

type DisplayInput = Exclude<BombermanInput, { type: 'stop' }>

export function GameRoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { currentRoom } = useLobbyStore()
  const [lastInput, setLastInput] = useState<DisplayInput | null>(null)

  useEffect(() => {
    if (!currentRoom || currentRoom.id !== roomId) {
      navigate('/lobby')
    }
  }, [currentRoom, roomId, navigate])

  if (!currentRoom) {
    return null
  }

  const handleGameInput = (input: BombermanInput) => {
    if (input.type === 'stop') return
    setLastInput(input)
  }

  const formatLastInput = () => {
    if (!lastInput) return '入力なし'
    if (lastInput.type === 'place_bomb') return '爆弾を設置'

    const directionLabels = {
      up: '上へ移動',
      down: '下へ移動',
      left: '左へ移動',
      right: '右へ移動',
    }

    return directionLabels[lastInput.direction]
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm font-semibold text-cyan-300">
              ボンバーマン
            </p>
            <h1 className="text-2xl font-bold">{currentRoom.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-32 items-center justify-center whitespace-nowrap rounded-md bg-gray-800 px-3 text-sm font-semibold text-gray-100">
              {formatLastInput()}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/room/${currentRoom.id}`)}
            >
              待機室へ戻る
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <GameCanvas onInput={handleGameInput} />
      </main>
    </div>
  )
}

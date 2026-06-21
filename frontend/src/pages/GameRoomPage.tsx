import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { GameCanvas } from '../components/game/GameCanvas'
import { useLobbyStore } from '../stores/lobbyStore'
import { useGameStore } from '../stores/gameStore'
import type {
  BombermanGameState,
  BombermanInput,
  BombermanPlayer,
} from '../game/bomberman/bombermanTypes'

type DisplayInput = Exclude<BombermanInput, { type: 'stop' }>
type GameResult = 'WIN' | 'LOSE' | 'DRAW' | null

export function GameRoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { currentRoom, rooms, setCurrentRoom } = useLobbyStore()
  const [lastInput, setLastInput] = useState<DisplayInput | null>(null)

  const [gameResult, setGameResult] = useState<GameResult>(null)
  const gameState = useGameStore((state) => state.gameState)

  useEffect(() => {
    if (!roomId) {
      navigate('/lobby')
      return
    }

    if (currentRoom?.id === roomId) {
      return
    }

    const room = rooms.find((item) => item.id === roomId)
    if (room) {
      setCurrentRoom(room)
      return
    }

    setCurrentRoom({
      id: roomId,
      name: 'Local Bomberman',
      hostId: '0',
      hostName: 'current_user',
      players: [
        {
          userId: '0',
          username: 'current_user',
          isReady: true,
          isHost: true,
        },
      ],
      maxPlayers: 4,
      status: 'playing',
      mapId: 'local-bomberman',
      createdAt: new Date(),
    })
  }, [navigate, roomId, rooms, setCurrentRoom])

  const handleGameInput= useCallback((input: BombermanInput) => {
    if (input.type === 'stop') return
    setLastInput(input)
  }, [])

  if (!currentRoom) {
    return null
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

  const livingPlayers = Object.values(gameState?.players ?? {})
    .filter((player: BombermanPlayer) => player.alive).length;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm font-semibold text-cyan-300">ボンバーマン</p>
            <h1 className="text-2xl font-bold">{currentRoom.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-24 items-center justify-center whitespace-nowrap rounded-md bg-cyan-500/15 px-3 text-sm font-semibold text-cyan-100">
              {gameResult ? gameResult : '対戦中'}
            </div>
            <div className="flex h-10 w-20 items-center justify-center whitespace-nowrap rounded-md bg-gray-800 px-3 text-sm font-semibold text-gray-100">
              生存 {livingPlayers}
            </div>
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

      <main className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <GameCanvas onInput={handleGameInput} onGameEnd={setGameResult} />
        
        {gameResult && (
          <div className="pointer-events-none absolute inset-x-4 top-1/2 z-10 flex -translate-y-1/2 justify-center sm:inset-x-6 lg:inset-x-8">
            <div className="rounded-lg border border-cyan-300/40 bg-gray-950/85 px-8 py-6 text-center shadow-2xl shadow-cyan-500/20">
              <p className="text-5xl font-black italic tracking-normal text-cyan-200 drop-shadow-[0_0_18px_rgba(34,211,238,0.9)]">
                {gameResult === 'WIN' && 'YOU WIN'}
                {gameResult === 'LOSE' && 'GAME OVER'}
                {gameResult === 'DRAW' && 'DRAW'}
              </p>
              <p className="mt-3 text-sm font-semibold text-gray-300">
                待機室へ戻って再開できます
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

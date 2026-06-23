import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { GameCanvas } from '../components/game/GameCanvas'
import { GameResultOverlay } from '../components/game/GameResultOverlay'
import { useLobbyStore } from '../stores/lobbyStore'
import { useGameStore } from '../stores/gameStore'
import { useDisconnectPenalty } from '../hooks/useDisconnectPenalty'
import type {
  BombermanInput,
  BombermanPlayer,
  GameEndPayload,
} from '../game/bomberman/bombermanTypes'

type DisplayInput = Exclude<BombermanInput, { type: 'stop' }>
type GameResult = 'WIN' | 'LOSE' | 'DRAW' | null

export function GameRoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { currentRoom, rooms, setCurrentRoom } = useLobbyStore()

  const [lastInput, setLastInput] = useState<DisplayInput | null>(null)
  const [gameResult, setGameResult] = useState<GameResult>(null)
  const [rankings, setRankings] = useState<GameEndPayload['rankings']>([])

  const gameState = useGameStore((state) => state.gameState)
  const playersCount = Object.keys(gameState?.players ?? {}).length

  // カスタムフックで切断ペナルティを判定
  const hasPenalty = useDisconnectPenalty(roomId, !!gameResult, playersCount)

  useEffect(() => {
    if (hasPenalty && !gameResult) {
      setGameResult('LOSE')
    }
  }, [hasPenalty, gameResult])

  // ルームの初期化・フォールバック処理
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

  const handleGameInput = useCallback((input: BombermanInput) => {
    if (input.type === 'stop') return
    setLastInput(input)
  }, [])

  const handleGameEnd = useCallback(
    (result: GameResult, resultRankings?: GameEndPayload['rankings']) => {
      setGameResult(result)
      if (resultRankings) {
        setRankings(resultRankings)
      }
    },
    []
  )

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

  const livingPlayers = Object.values(gameState?.players ?? {}).filter(
    (player: BombermanPlayer) => player.alive
  ).length

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
              onClick={() => navigate('/lobby')}
            >
              ロビーへ戻る
            </Button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <GameCanvas
          roomId={currentRoom.id}
          onInput={handleGameInput}
          onGameEnd={handleGameEnd}
        />

        <GameResultOverlay
          result={gameResult}
          rankings={rankings}
          isDisconnected={hasPenalty}
        />
      </main>
    </div>
  )
}

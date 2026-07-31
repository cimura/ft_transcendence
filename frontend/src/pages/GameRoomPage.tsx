import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { GameCanvas } from '../components/game/GameCanvas'
import { GameResultOverlay } from '../components/game/GameResultOverlay'
import { useRoomStore } from '../stores/roomStore'
import { useGameStore } from '../stores/gameStore'
import type { PlayerSnapshot } from '@ft_transcendence/shared/game-events.types'
import { getRoom } from '../api/rooms'

export function GameRoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { currentRoom, rooms, setCurrentRoom } = useRoomStore()

  const gameState = useGameStore((state) => state.gameState)

  useEffect(() => {
    if (!roomId) {
      navigate('/home', { replace: true })
      return
    }

    if (currentRoom?.id === roomId) {
      if (currentRoom.status === 'waiting') {
        navigate(`/room/${currentRoom.id}`, { replace: true })
      }
      return
    }

    const room = rooms.find((item) => item.id === roomId)
    if (room) {
      setCurrentRoom(room)
      if (room.status === 'waiting') {
        navigate(`/room/${room.id}`, { replace: true })
      }
      return
    }

    let cancelled = false

    const loadRoom = async () => {
      try {
        const fetchedRoom = await getRoom(roomId)
        if (cancelled) return
        setCurrentRoom(fetchedRoom)
        if (fetchedRoom.status === 'waiting') {
          navigate(`/room/${fetchedRoom.id}`, { replace: true })
        }
      } catch (error) {
        console.error('Failed to load game room:', error)
        if (!cancelled) {
          navigate('/home', { replace: true })
        }
      }
    }

    void loadRoom()

    return () => {
      cancelled = true
    }
  }, [
    navigate,
    roomId,
    rooms,
    setCurrentRoom,
    currentRoom?.id,
    currentRoom?.status,
  ])

  // ゲーム中は画面が1ビューポートに収まるため、縦スクロールを止める
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  if (!currentRoom) {
    return null
  }

  const livingPlayers = Object.values(gameState?.players ?? {}).filter(
    (player: PlayerSnapshot) => player.alive
  ).length

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-gray-950 text-white">
      <header className="shrink-0 border-b border-gray-800 bg-gray-900">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm font-semibold text-cyan-300">ボンバーマン</p>
            <h1 className="text-2xl font-bold">{currentRoom.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-20 items-center justify-center whitespace-nowrap rounded-md bg-gray-800 px-3 text-sm font-semibold text-gray-100">
              生存 {livingPlayers}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/home')}
            >
              ホームへ戻る
            </Button>
          </div>
        </div>
      </header>

      <main className="relative min-h-0 flex-1">
        <GameCanvas roomId={currentRoom.id} />

        <GameResultOverlay />
      </main>
    </div>
  )
}

import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { GameCanvas } from '../components/game/GameCanvas'
import { GameResultOverlay } from '../components/game/GameResultOverlay'
import { useRoomStore } from '../stores/roomStore'
import { useGameStore } from '../stores/gameStore'
import type { PlayerSnapshot } from '@ft_transcendence/shared/game-events.types'
import { getRoom } from '../api/rooms'
import BackgroundVideo from '../components/common/BackgroundVideo'

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
          
          {/* ホーム画面に合わせたサイバーなカスタムボタン */}
          <button
            onClick={() => navigate('/home')}
            className="group relative px-6 py-2 bg-cyan-900/40 backdrop-blur-md border border-cyan-400/60 transition-all duration-300 hover:border-cyan-300 hover:bg-cyan-800/60 hover:shadow-[0_0_15px_rgba(0,255,255,0.4)] hover:-translate-y-0.5"
            style={{
              clipPath:
                'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
            }}
          >
            <div className="absolute top-1 right-1 w-1 h-1 bg-cyan-300 rounded-full shadow-[0_0_5px_rgba(0,255,255,0.8)]" />
            <div className="absolute bottom-1 left-1 w-1 h-1 bg-cyan-300 rounded-full shadow-[0_0_5px_rgba(0,255,255,0.8)]" />
            <span className="text-sm font-bold text-white tracking-widest drop-shadow-md">
              ホームへ戻る
            </span>
          </button>
        </div>
      </header>

      <main className="relative min-h-0 flex-1">
        <GameCanvas roomId={currentRoom.id} />

        <GameResultOverlay />
      </main>
    </div>
  )
}
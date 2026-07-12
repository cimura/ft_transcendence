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

  if (!currentRoom) {
    return null
  }

  const livingPlayers = Object.values(gameState?.players ?? {}).filter(
    (player: PlayerSnapshot) => player.alive
  ).length

  return (
    <div className="space-page">
      <header className="console-header">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="console-kicker">BOMBERMAN / LIVE SESSION</p>
            <h1 className="console-title">{currentRoom.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-20 items-center justify-center whitespace-nowrap border border-emerald-100/25 bg-[#0a2822] px-3 text-sm font-semibold text-emerald-50/85">
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

      <main className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <GameCanvas roomId={currentRoom.id} />

        <GameResultOverlay />
      </main>
    </div>
  )
}

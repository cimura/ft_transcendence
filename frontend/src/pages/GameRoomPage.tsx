import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { GameCanvas } from '../components/game/GameCanvas'
import { GameResultOverlay } from '../components/game/GameResultOverlay'
import { RetireConfirmDialog } from '../components/game/RetireConfirmDialog'
import { useRoomStore } from '../stores/roomStore'
import { useGameStore } from '../stores/gameStore'
import { useGameSocket } from '../hooks/useGameSocket'
import type { PlayerSnapshot } from '@ft_transcendence/shared/game-events.types'
import type { GameRoom } from '../types/room'
import { getRoom } from '../api/rooms'

export function GameRoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { currentRoom, rooms, setCurrentRoom } = useRoomStore()

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

  return <GameRoomView room={currentRoom} />
}

type GameRoomViewProps = {
  room: GameRoom
}

function GameRoomView({ room }: GameRoomViewProps) {
  const navigate = useNavigate()
  const gameState = useGameStore((state) => state.gameState)
  const gamePhase = useGameStore((state) => state.gamePhase)
  const myPlayerId = useGameStore((state) => state.myPlayerId)
  const { socketRef, leaveGame } = useGameSocket(room.id)

  const [isRetireDialogOpen, setIsRetireDialogOpen] = useState(false)

  const livingPlayers = Object.values(gameState?.players ?? {}).filter(
    (player: PlayerSnapshot) => player.alive
  ).length

  // 対戦中(countdown/playing)かつ自分がまだ生存中のときだけリタイア確認を挟む。
  const isInBattle = gamePhase === 'countdown' || gamePhase === 'playing'
  const isMeAlive =
    myPlayerId !== null && gameState.players[myPlayerId]?.alive === true
  const needsRetireConfirm = isInBattle && isMeAlive

  const handleBackToHome = () => {
    if (needsRetireConfirm) {
      setIsRetireDialogOpen(true)
      return
    }
    navigate('/home')
  }

  const handleRetireConfirm = () => {
    setIsRetireDialogOpen(false)
    leaveGame()
    navigate('/home')
  }

  const handleRetireCancel = () => {
    setIsRetireDialogOpen(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm font-semibold text-cyan-300">ボンバーマン</p>
            <h1 className="text-2xl font-bold">{room.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-20 items-center justify-center whitespace-nowrap rounded-md bg-gray-800 px-3 text-sm font-semibold text-gray-100">
              生存 {livingPlayers}
            </div>
            <Button variant="secondary" size="sm" onClick={handleBackToHome}>
              ホームへ戻る
            </Button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <GameCanvas socketRef={socketRef} />

        <GameResultOverlay />
      </main>

      <RetireConfirmDialog
        isOpen={isRetireDialogOpen}
        onConfirm={handleRetireConfirm}
        onCancel={handleRetireCancel}
      />
    </div>
  )
}

import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { GameCanvas } from '../components/game/GameCanvas'
import { GameResultOverlay } from '../components/game/GameResultOverlay'
import { useLobbyStore } from '../stores/lobbyStore'
import { useGameStore } from '../stores/gameStore'
import type { PlayerSnapshot } from '@ft_transcendence/shared/game-events.types'

export function GameRoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { currentRoom, rooms, setCurrentRoom } = useLobbyStore()

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
  }, [navigate, roomId, rooms, setCurrentRoom, currentRoom?.id])

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
              onClick={() => navigate('/lobby')}
            >
              EXIT TO LOBBY
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

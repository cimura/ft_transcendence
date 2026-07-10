import type { GameRoom } from '../../types/room'
import { Button } from '../common/Button'

interface Props {
  room: GameRoom
  onJoin: (roomId: string) => void
}

export function RoomCard({ room, onJoin }: Props) {
  const isFull = room.players.length >= room.maxPlayers
  const isPlaying = room.status === 'playing'

  const statusColors = {
    waiting: 'border-[#b8ff64] bg-[#29451f] text-[#d2ff8c]',
    playing: 'border-[#ffd86b] bg-[#5b4820] text-[#fff0b9]',
    finished: 'border-emerald-100/20 bg-[#1b3731] text-emerald-100/60',
  }

  return (
    <div className="console-panel p-5 transition-colors hover:border-emerald-200/65">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-bold tracking-wide text-white">{room.name}</h3>
        <span
          className={`border px-2 py-1 text-xs font-bold tracking-wide ${statusColors[room.status]}`}
        >
          {room.status}
        </span>
      </div>

      <p className="mb-3 text-sm text-emerald-100/65">HOST: {room.hostName}</p>

      <div className="mb-4 flex items-center gap-2">
        <div className="flex">
          {Array.from({ length: room.maxPlayers }).map((_, i) => (
            <div
              key={i}
              className={`h-5 w-5 border ${
                i < room.players.length
                  ? 'border-[#b8ff64] bg-[#b8ff64]'
                  : 'border-emerald-100/25 bg-[#0a2822]'
              }`}
            />
          ))}
        </div>
        <span className="text-sm font-bold text-emerald-50/80">
          {room.players.length} / {room.maxPlayers}
        </span>
      </div>

      {/* 参加ボタン */}
      <Button
        variant="primary"
        size="sm"
        onClick={() => onJoin(room.id)}
        disabled={isFull || isPlaying}
        className="w-full"
      >
        {isFull ? '満員' : isPlaying ? 'プレイ中' : '参加'}
      </Button>
    </div>
  )
}

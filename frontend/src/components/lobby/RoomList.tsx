import type { RoomSnapshot } from '@ft_transcendence/shared/rooms-events.types'
import { RoomCard } from './RoomCard'

interface Props {
  rooms: RoomSnapshot[]
  onJoin: (roomId: string) => void
}

export function RoomList({ rooms, onJoin }: Props) {
  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-cyan-800/50 bg-cyan-950/10 py-16">
        <span className="text-cyan-600/60 font-mono text-sm tracking-[0.2em]">
          NO ACTIVE ROOMS
        </span>
        <p className="text-xs text-cyan-700/60">
          作戦領域が存在しません。新規作成して対戦を開始しましょう。
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {rooms.map((room) => (
        <RoomCard key={room.id} room={room} onJoin={onJoin} />
      ))}
    </div>
  )
}

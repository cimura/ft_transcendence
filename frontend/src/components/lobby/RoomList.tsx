import type { GameRoom } from '../../types/room'
import { RoomCard } from './RoomCard'

interface Props {
  rooms: GameRoom[]
  onJoin: (roomId: string) => void
}

export function RoomList({ rooms, onJoin }: Props) {
  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-lg text-gray-500">部屋がありません</p>
        <p className="mt-2 text-sm text-gray-400">
          新しい部屋を作成してゲームを始めましょう
        </p>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {rooms.map((room) => (
        <RoomCard key={room.id} room={room} onJoin={onJoin} />
      ))}
    </div>
  )
}

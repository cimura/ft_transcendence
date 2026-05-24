import type { GameRoom } from '../../types/room'
import { RoomCard } from './RoomCard'

interface Props {
  rooms: GameRoom[]
  onJoin: (roomId: string) => void
}

export function RoomList({ rooms, onJoin }: Props) {
  if (rooms.length === 0) {
    return <p>no rooms</p>
  }
  return (
    <div>
      {rooms.map((room) => (
        <RoomCard key={room.id} room={room} onJoin={onJoin} />
      ))}
    </div>
  )
}

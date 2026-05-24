import type { GameRoom } from '../../types/room'

interface Props {
  room: GameRoom
  onJoin: (roomId: string) => void
}

export function RoomCard({ room, onJoin }: Props) {
  const isFull = room.players.length >= room.maxPlayers
  const isPlaying = room.status === 'playing'

  return (
    <div>
      <span>{room.name}</span>
      <span>{room.hostName}</span>
      <span>
        {room.players.length} / {room.maxPlayers}
      </span>
      <span>{room.status}</span>
      <button onClick={() => onJoin(room.id)} disabled={isFull || isPlaying}>
        Join
      </button>
    </div>
  )
}

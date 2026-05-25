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
    waiting: 'bg-green-500',
    playing: 'bg-yellow-500',
    finished: 'bg-gray-500',
  }

  return (
    <div className="rounded-lg border border-gray-300 bg-white p-4 shadow-md transition-shadow hover:shadow-lg">
      {/* ヘッダー部分 */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">{room.name}</h3>
        <span
          className={`rounded-full px-2 py-1 text-xs font-semibold text-white ${statusColors[room.status]}`}
        >
          {room.status}
        </span>
      </div>

      {/* ホスト名 */}
      <p className="mb-2 text-sm text-gray-600">Host: {room.hostName}</p>

      {/* プレイヤー数 */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex">
          {/* プレイヤーアイコン */}
          {Array.from({ length: room.maxPlayers }).map((_, i) => (
            <div
              key={i}
              className={`h-6 w-6 rounded-full border-2 ${
                i < room.players.length
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-gray-300 bg-gray-100'
              }`}
            />
          ))}
        </div>
        <span className="text-sm font-medium text-gray-700">
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

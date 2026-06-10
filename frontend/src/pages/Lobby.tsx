import { useState } from 'react'
import { useLobbyStore } from '../stores/lobbyStore'
import { useLobbySocket } from '../hooks/useLobbySocket'
import type { CreateRoomDto } from '../types'
import { Button } from '../components/common/Button'
import { RoomFilter } from '../components/lobby/RoomFilter'
import { RoomList } from '../components/lobby/RoomList'
import { CreateRoomModal } from '../components/lobby/CreateRoomModal'
import { useNavigate } from 'react-router-dom'

type FilterType = 'all' | 'waiting' | 'playing' | 'finished'

export function Lobby() {
  const navigate = useNavigate()
  const { rooms, setCurrentRoom, upsertRoom } = useLobbyStore()
  const [filter, setFilter] = useState<FilterType>('waiting')
  const [isModalOpen, setIsModalOpen] = useState(false)

  // WebSocketに接続
  useLobbySocket()

  const filteredRooms = rooms.filter((room) => {
    if (filter === 'all') return true
    if (filter === 'waiting') return room.status === 'waiting'
    if (filter === 'playing') return room.status === 'playing'
    if (filter === 'finished') return room.status === 'finished'
    return false
  })
  // create rooms
  const handleCreateRoom = (dto: CreateRoomDto) => {
    console.log('create rooms...', dto)
    const room = {
      id: `local-${Date.now()}`,
      name: dto.name,
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
      maxPlayers: dto.maxPlayers,
      status: 'waiting' as const,
      mapId: dto.mapId,
      createdAt: new Date(),
    }

    upsertRoom(room)
    setCurrentRoom(room)
    setIsModalOpen(false)
    navigate(`/room/${room.id}`)
  }
  // join rooms
  const handleJoinRoom = (roomId: string) => {
    console.log('join rooms...', roomId)
    const room = rooms.find((r) => r.id === roomId)
    if (!room) return

    const joinedRoom = {
      ...room,
      players: room.players.some((player) => player.userId === '0')
        ? room.players
        : [
            ...room.players,
            {
              userId: '0',
              username: 'current_user',
              isReady: false,
              isHost: false,
            },
          ],
    }

    upsertRoom(joinedRoom)
    setCurrentRoom(joinedRoom)
    navigate(`/room/${roomId}`)
    // TODO: バックエンド接続後は socket.emit('room:join', { roomId }) に置き換える
  }
  return (
    <div className="min-h-screen bg-gray-100">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* 戻るボタン追加 */}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/home')}
              >
                ← 戻る
              </Button>
              <h1 className="text-3xl font-bold text-gray-900">ゲームロビー</h1>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsModalOpen(true)}
            >
              + 新しい部屋を作成
            </Button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* フィルター */}
        <div className="mb-6">
          <RoomFilter currentFilter={filter} onFilterChange={setFilter} />
        </div>

        {/* 部屋一覧 */}
        <RoomList rooms={filteredRooms} onJoin={handleJoinRoom} />
      </main>

      {/* 部屋作成モーダル */}
      <CreateRoomModal
        isOpen={isModalOpen}
        onSubmit={handleCreateRoom}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}

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
  const { rooms } = useLobbyStore()
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
    // TODO: バックエンドと接続
  }
  // join rooms
  const handleJoinRoom = (roomId: string) => {
    console.log('join rooms...', roomId)
    // TODO: バックエンドと接続
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

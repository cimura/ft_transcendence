import { useEffect, useState } from 'react'
import { useLobbyStore } from '../stores/lobbyStore'
import { useLobbySocket } from '../hooks/useLobbySocket'
import type { CreateRoomDto } from '../types'
import { Button } from '../components/common/Button'
import { RoomFilter } from '../components/lobby/RoomFilter'
import { RoomList } from '../components/lobby/RoomList'
import { CreateRoomModal } from '../components/lobby/CreateRoomModal'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import api from '../api/client'
import { getRoom, joinRoom } from '../api/rooms'
import { useAuthStore } from '../stores/authStore'

type FilterType = 'all' | 'waiting' | 'playing' | 'finished'

export function Lobby() {
  const navigate = useNavigate()
  const { rooms, setCurrentRoom, upsertRoom, removeRoom } = useLobbyStore()
  const [filter, setFilter] = useState<FilterType>('waiting')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { currentUser, fetchCurrentUser } = useAuthStore()

  // WebSocketに接続
  useLobbySocket()

  useEffect(() => {
    if (!currentUser) {
      fetchCurrentUser()
    }
  }, [currentUser, fetchCurrentUser])

  const filteredRooms = rooms.filter((room) => {
    if (filter === 'all') return true
    if (filter === 'waiting') return room.status === 'waiting'
    if (filter === 'playing') return room.status === 'playing'
    if (filter === 'finished') return room.status === 'finished'
    return false
  })
  // create rooms
  const handleCreateRoom = async (dto: CreateRoomDto) => {
    try {
      const response = await api.post('/rooms', dto)
      const room = response.data

      upsertRoom(room)
      setCurrentRoom(room)
      setIsModalOpen(false)
      navigate(`/room/${room.id}`)
    } catch (error) {
      console.error('room create failed', error)
    }
  }
  // join rooms
  const handleJoinRoom = async (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId)

    if (!room) {
      console.error('Room not found:', roomId)
      return
    }

    let user = currentUser
    if (!user) {
      await fetchCurrentUser()
      user = useAuthStore.getState().currentUser
    }

    if (!user) {
      console.error('Current user is not loaded')
      return
    }

    const alreadyJoined = room.players.some(
      (player) => player.userId === user.id
    )

    if (alreadyJoined) {
      setCurrentRoom(room)
      navigate(`/room/${roomId}`)
      return
    }

    console.log('join rooms...', roomId)

    try {
      const joinedRoom = await joinRoom(roomId)

      upsertRoom(joinedRoom)
      setCurrentRoom(joinedRoom)
      navigate(`/room/${roomId}`)
    } catch (error) {
   if (axios.isAxiosError(error)) {
    const status = error.response?.status

    if (status === 403 || status === 404) {
      removeRoom(roomId)
      console.error('Failed to join room:', error)
      return
    }

    if (status === 409) {
      try {
        const latestRoom = await getRoom(roomId)

        if (
          latestRoom.players.some(
            (player: { userId: string }) => player.userId === user.id
          )
        ) {
          upsertRoom(latestRoom)
          setCurrentRoom(latestRoom)
          navigate(`/room/${roomId}`)
          return
        }

        upsertRoom(latestRoom)
      } catch (refreshError) {
        if (
          axios.isAxiosError(refreshError) &&
          [403, 404].includes(refreshError.response?.status ?? 0)
        ) {
          removeRoom(roomId)
        }

        console.error('Failed to refresh room after join conflict:', refreshError)
      }

      return
    }
  }


      console.error('Failed to join room:', error)
    }
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

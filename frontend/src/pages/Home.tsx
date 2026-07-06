import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useLobbyStore } from '../stores/lobbyStore'
import { createRoom } from '../api/rooms'

export function Home() {
  const navigate = useNavigate()
  const { currentUser, fetchCurrentUser, loading } = useAuthStore()
  const { setCurrentRoom, upsertRoom } = useLobbyStore()
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)

  useEffect(() => {
    if (!currentUser) {
      fetchCurrentUser()
    }
  }, [currentUser, fetchCurrentUser])

  const handleMyProfileClick = async () => {
    if (currentUser) {
      navigate(`/profile/${currentUser.id}`)
      return
    }

    await fetchCurrentUser()
    const fetchedUser = useAuthStore.getState().currentUser

    if (fetchedUser) {
      navigate(`/profile/${fetchedUser.id}`)
    }
  }

  const handleWaitingRoomClick = async () => {
    if (isCreatingRoom) return

    setIsCreatingRoom(true)
    try {
      let user = currentUser
      if (!user) {
        await fetchCurrentUser()
        user = useAuthStore.getState().currentUser
      }

      const username = user?.displayName || user?.username || 'Player'
      const room = await createRoom({
        name: `${username} の部屋`,
        maxPlayers: 2,
      })

      upsertRoom(room)
      setCurrentRoom(room)
      navigate(`/room/${room.id}`)
    } catch (error) {
      console.error('Failed to create waiting room:', error)
    } finally {
      setIsCreatingRoom(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-black">
      {/* メインコンテンツ */}
      <div className="flex min-h-screen items-center justify-center">
        <div className="grid gap-8">
          {/* 上段: マイプロフィール・フレンド */}
          <div className="grid grid-cols-2 gap-8">
            <button
              onClick={handleMyProfileClick}
              disabled={loading}
              className="rounded-full bg-black bg-opacity-70 px-12 py-6 text-2xl font-bold text-white transition-all hover:bg-opacity-90"
            >
              マイプロフィール
            </button>
            <button
              onClick={() => navigate('/friends')}
              className="rounded-full bg-black bg-opacity-70 px-12 py-6 text-2xl font-bold text-white transition-all hover:bg-opacity-90"
            >
              フレンド
            </button>
          </div>

          {/* 中央: 待機場（メイン） */}
          <button
            onClick={handleWaitingRoomClick}
            disabled={isCreatingRoom}
            className="rounded-3xl bg-black bg-opacity-70 px-16 py-12 text-4xl font-bold text-white transition-all hover:bg-opacity-90"
          >
            {isCreatingRoom ? '作成中...' : '待機場'}
          </button>

          {/* 下段: 設定 */}
          <div className="flex justify-center">
            <button
              onClick={() => navigate('/settings')}
              className="rounded-full bg-black bg-opacity-70 px-12 py-6 text-2xl font-bold text-white transition-all hover:bg-opacity-90"
            >
              設定
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

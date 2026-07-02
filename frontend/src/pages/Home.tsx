import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useNotifications } from '../hooks/useNotifications'

export function Home() {
  const navigate = useNavigate()
  const { currentUser, fetchCurrentUser, loading } = useAuthStore()
  const { notifications } = useNotifications()

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
            onClick={() => navigate('/lobby')}
            className="rounded-3xl bg-black bg-opacity-70 px-16 py-12 text-4xl font-bold text-white transition-all hover:bg-opacity-90"
          >
            待機場
          </button>

          {/* 下段: 通知・設定 */}
          <div className="grid grid-cols-2 gap-8">
            <button
              onClick={() => navigate('/notifications')}
              className="relative rounded-full bg-black bg-opacity-70 px-12 py-6 text-2xl font-bold text-white transition-all hover:bg-opacity-90"
            >
              通知
              {notifications.length > 0 && (
                <span className="absolute -right-2 -top-2 flex h-8 min-w-8 items-center justify-center rounded-full bg-red-600 px-2 text-base font-bold text-white">
                  {notifications.length}
                </span>
              )}
            </button>
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

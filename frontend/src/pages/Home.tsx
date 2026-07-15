import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useRoomStore } from '../stores/roomStore'
import { createRoom } from '../api/rooms'
import { useNotifications } from '../hooks/useNotifications'

/**
 * Renders the home dashboard with navigation to profile, friends, lobby, notifications, rankings, and settings.
 */
export function Home() {
  const navigate = useNavigate()
  const { currentUser, fetchCurrentUser, loading } = useAuthStore()
  const { setCurrentRoom, upsertRoom } = useRoomStore()
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)
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

  const handleStartMatchClick = async () => {
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
      console.error('Failed to create match room:', error)
    } finally {
      setIsCreatingRoom(false)
    }
  }

  return (
    // 背景は透明のまま、画面全体を中央揃えに
    <div className="relative min-h-screen bg-transparent flex items-center justify-center overflow-hidden">
      
      {/* うっすらとしたHUD（ヘッドアップディスプレイ）風のガイドライン */}
      <div className="absolute inset-10 border border-cyan-900/20 rounded-full pointer-events-none" />

      <div className="flex flex-col items-center justify-center gap-16 w-full max-w-4xl p-8 relative z-10">
        
        {/* 上段: マイプロフィール・フレンド */}
        <div className="flex w-full justify-between gap-12 px-10">
          <button
            onClick={handleMyProfileClick}
            disabled={loading}
            // 変更点: 左上と右下だけ角を丸くしてSF風の装甲パネルのような形に
            // ホバー時に上に少し浮き（-translate-y-1）、文字間隔が広がる
            className="group relative flex-1 rounded-tl-3xl rounded-br-3xl rounded-tr-md rounded-bl-md bg-black/50 backdrop-blur-md border border-cyan-500/40 py-6 text-xl font-bold text-cyan-100 transition-all duration-300 hover:bg-cyan-900/50 hover:border-cyan-300 hover:shadow-[0_0_25px_rgba(0,255,255,0.6)] hover:-translate-y-1 hover:scale-105"
          >
            <span className="relative z-10 transition-all duration-300 group-hover:tracking-[0.3em]">マイプロフィール</span>
          </button>

          <button
            onClick={() => navigate('/friends')}
            // こちらは右上と左下を丸くして、左右対称のデザインにする
            className="group relative flex-1 rounded-tr-3xl rounded-bl-3xl rounded-tl-md rounded-br-md bg-black/50 backdrop-blur-md border border-cyan-500/40 py-6 text-xl font-bold text-cyan-100 transition-all duration-300 hover:bg-cyan-900/50 hover:border-cyan-300 hover:shadow-[0_0_25px_rgba(0,255,255,0.6)] hover:-translate-y-1 hover:scale-105"
          >
            <span className="relative z-10 transition-all duration-300 group-hover:tracking-[0.3em]">フレンド</span>
          </button>
        </div>

        {/* 中央: 対戦開始（メイン） - 巨大なリアクターコア風 */}
        <div className="relative w-full max-w-xl">
          {/* ボタンの背後で常に脈打つオーラ（パルスアニメーション） */}
          <div className="absolute -inset-4 rounded-[3rem] bg-gradient-to-r from-cyan-500 to-blue-600 opacity-20 blur-xl animate-pulse pointer-events-none" />
          
          <button
            onClick={handleStartMatchClick}
            disabled={isCreatingRoom}
            // 鋭角なデザイン。ホバー時に大きく光り、拡大する
            className="group relative w-full overflow-hidden rounded-[2.5rem] rounded-tl-none rounded-br-none bg-gradient-to-br from-cyan-600/80 via-blue-700/80 to-indigo-900/80 backdrop-blur-md border-2 border-cyan-300/60 py-12 text-5xl font-bold text-white transition-all duration-500 ease-out hover:border-cyan-100 hover:shadow-[0_0_50px_rgba(0,255,255,0.8)] hover:scale-110 disabled:opacity-50"
          >
            {/* ホバー時に左から右へ光の反射が走るギミック */}
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full transition-transform duration-700 ease-in-out group-hover:translate-x-full" />
            
            <span className="relative z-10 transition-all duration-500 group-hover:tracking-[0.4em] group-hover:drop-shadow-[0_0_15px_rgba(255,255,255,1)]">
              {isCreatingRoom ? 'SYSTEM BOOTING...' : '対戦開始'}
            </span>
          </button>
        </div>

        {/* 下段: 通知・ランキング・設定 */}
        <div className="flex w-full justify-center gap-8">
          <button
            onClick={() => navigate('/notifications')}
            className="group relative w-48 rounded-tl-2xl rounded-br-2xl rounded-tr-sm rounded-bl-sm bg-black/50 backdrop-blur-md border border-cyan-500/40 py-4 text-lg font-bold text-cyan-100 transition-all duration-300 hover:bg-cyan-900/50 hover:border-cyan-300 hover:shadow-[0_0_20px_rgba(0,255,255,0.6)] hover:-translate-y-1 hover:scale-105"
          >
            <span className="relative z-10 transition-all duration-300 group-hover:tracking-[0.2em]">通知</span>
            {notifications.length > 0 && (
              // 通知アイコンも少しリッチに（浮遊感のあるアニメーション）
              <span className="absolute -right-2 -top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-red-500 shadow-[0_0_15px_rgba(255,0,0,0.8)] px-2 text-sm font-bold text-white border border-red-300 animate-bounce">
                {notifications.length}
              </span>
            )}
          </button>
          
          <button
            onClick={() => navigate('/rankings')}
            // 中央のボタンは対称形の六角形っぽいイメージに
            className="group relative w-48 rounded-xl bg-black/50 backdrop-blur-md border border-cyan-500/40 py-4 text-lg font-bold text-cyan-100 transition-all duration-300 hover:bg-cyan-900/50 hover:border-cyan-300 hover:shadow-[0_0_20px_rgba(0,255,255,0.6)] hover:-translate-y-1 hover:scale-105"
          >
            <span className="relative z-10 transition-all duration-300 group-hover:tracking-[0.2em]">ランキング</span>
          </button>
          
          <button
            onClick={() => navigate('/settings')}
            className="group relative w-48 rounded-tr-2xl rounded-bl-2xl rounded-tl-sm rounded-br-sm bg-black/50 backdrop-blur-md border border-cyan-500/40 py-4 text-lg font-bold text-cyan-100 transition-all duration-300 hover:bg-cyan-900/50 hover:border-cyan-300 hover:shadow-[0_0_20px_rgba(0,255,255,0.6)] hover:-translate-y-1 hover:scale-105"
          >
            <span className="relative z-10 transition-all duration-300 group-hover:tracking-[0.2em]">設定</span>
          </button>
        </div>
        
      </div>
    </div>
  )
}
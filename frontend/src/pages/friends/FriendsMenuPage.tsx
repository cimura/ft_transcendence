import { useNavigate } from 'react-router-dom'

/**
 * FriendsMenuPage component
 * Menu page for friend-related features
 */
export function FriendsMenuPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* メインコンテナ */}
      <div className="relative w-full max-w-2xl">
        {/* 戻るボタン */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 bg-black/50 text-white px-6 py-3 rounded-full border-2 border-white/20 hover:border-white/40 transition-all"
        >
          戻る
        </button>

        {/* タイトル */}
        <div className="bg-black/80 rounded-t-3xl border-2 border-white/30 px-8 py-6 text-center">
          <h1 className="text-4xl font-bold text-white">フレンド</h1>
        </div>

        {/* メニューボタン */}
        <div className="bg-black/80 border-x-2 border-b-2 border-white/30 rounded-b-3xl px-8 py-12 space-y-6">
          {/* フレンド一覧ボタン */}
          <button
            onClick={() => navigate('/friends/list')}
            className="w-full bg-black text-white text-2xl font-bold py-6 rounded-full border-2 border-white/40 hover:border-white/60 hover:bg-white/5 transition-all"
          >
            フレンド一覧
          </button>

          {/* フレンドリクエストボタン */}
          <button
            onClick={() => navigate('/friends/requests')}
            className="w-full bg-black text-white text-2xl font-bold py-6 rounded-full border-2 border-white/40 hover:border-white/60 hover:bg-white/5 transition-all"
          >
            フレンドリクエスト
          </button>

          {/* ユーザー検索ボタン */}
          <button
            onClick={() => navigate('/friends/search')}
            className="w-full bg-black text-white text-2xl font-bold py-6 rounded-full border-2 border-white/40 hover:border-white/60 hover:bg-white/5 transition-all"
          >
            ユーザー検索
          </button>
        </div>
      </div>
    </div>
  )
}

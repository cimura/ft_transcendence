import { useNavigate } from 'react-router-dom'

/**
 * FriendsMenuPage component
 * Menu page for friend-related features
 */
export function FriendsMenuPage() {
  const navigate = useNavigate()

  return (
    // 変更点: 背景を透明に
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4 relative">
      <div className="relative w-full max-w-2xl z-10">
        {/* 戻るボタン: SF風の小さなパネルに */}
        <button
          onClick={() => navigate('/home', { replace: true })}
          className="absolute -top-16 left-0 bg-black/40 backdrop-blur-md text-cyan-100 px-6 py-2 rounded-full border border-cyan-500/50 hover:bg-cyan-900/50 hover:border-cyan-300 hover:shadow-[0_0_15px_rgba(0,255,255,0.3)] transition-all"
        >
          &lt; 戻る
        </button>

        {/* タイトル */}
        <div className="bg-black/50 backdrop-blur-md rounded-t-3xl border border-cyan-500/30 px-8 py-8 text-center relative overflow-hidden">
          {/* 上部に走る光のライン */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-70" />
          <h1 className="text-4xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 drop-shadow-[0_0_10px_rgba(0,255,255,0.3)]">
            フレンド
          </h1>
        </div>

        {/* メニューボタン */}
        <div className="bg-black/50 backdrop-blur-md border-x border-b border-cyan-500/30 rounded-b-3xl px-8 py-12 space-y-6">
          {/* フレンド一覧ボタン */}
          <button
            onClick={() => navigate('/friends/list')}
            className="group w-full bg-cyan-950/30 text-cyan-100 text-2xl font-bold py-6 rounded-tl-2xl rounded-br-2xl rounded-tr-sm rounded-bl-sm border border-cyan-500/40 hover:border-cyan-300 hover:bg-cyan-900/50 hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] hover:-translate-y-1 transition-all duration-300"
          >
            <span className="relative z-10 transition-all duration-300 group-hover:tracking-[0.2em]">
              フレンド一覧
            </span>
          </button>

          {/* ユーザー検索ボタン */}
          <button
            onClick={() => navigate('/friends/search')}
            className="group w-full bg-cyan-950/30 text-cyan-100 text-2xl font-bold py-6 rounded-tl-2xl rounded-br-2xl rounded-tr-sm rounded-bl-sm border border-cyan-500/40 hover:border-cyan-300 hover:bg-cyan-900/50 hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] hover:-translate-y-1 transition-all duration-300"
          >
            <span className="relative z-10 transition-all duration-300 group-hover:tracking-[0.2em]">
              ユーザー検索
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

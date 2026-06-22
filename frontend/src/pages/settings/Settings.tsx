import { Outlet, useLocation, useNavigate } from "react-router-dom"

export const Settings = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const isTopLevel = location.pathname === '/settings'

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-black/80 border-2 border-white/30 rounded-3xl p-8">
        <div className="flex items-center mb-8">
          {isTopLevel ? (
            // [トップレベル]: 「閉じる(ホーム)」を表示
            <button
              onClick={() => navigate('/home')}
              className="text-white/50 hover:text-white mr-4 text-xl transition-colors"
            >
              ✕ 閉じる
            </button>
          ) : (
            // [詳細画面]: 「戻る(設定一覧)」を表示
            <button
              onClick={() => navigate('/settings')}
              className="text-white/70 hover:text-white mr-4 transition-colors"
            >
              ← 設定一覧に戻る
            </button>
          )}

          <h1 className="text-3xl font-bold text-white m-auto">
            {isTopLevel ? '設定' : '詳細設定'}
          </h1>
        </div>

        <Outlet />
      </div>
    </div>
  )
}

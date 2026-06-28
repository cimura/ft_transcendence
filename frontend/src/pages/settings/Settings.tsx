import { Outlet, useLocation, useNavigate } from 'react-router-dom'

interface SettingsProps {
  onLogout: () => void
}

export interface SettingsOutletContext {
  onLogout: () => void
}

export const Settings = ({ onLogout }: SettingsProps) => {
  const navigate = useNavigate()
  const location = useLocation()
  const isTopLevel = location.pathname === '/settings'

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4">
      <div className="w-full max-w-2xl rounded-lg border-2 border-white/30 bg-black/80 p-6 sm:p-8">
        <div className="mb-8 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          {isTopLevel ? (
            <button
              onClick={() => navigate('/home')}
              className="justify-self-start rounded-md px-3 py-2 text-left text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white sm:text-base"
            >
              ✕ 閉じる
            </button>
          ) : (
            <button
              onClick={() => navigate('/settings')}
              className="justify-self-start rounded-md px-3 py-2 text-left text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white sm:text-base"
            >
              ← 設定一覧に戻る
            </button>
          )}

          <h1 className="text-center text-2xl font-bold text-white sm:text-3xl">
            {isTopLevel ? '設定' : '詳細設定'}
          </h1>

          <div />
        </div>

        <Outlet context={{ onLogout } satisfies SettingsOutletContext} />
      </div>
    </div>
  )
}

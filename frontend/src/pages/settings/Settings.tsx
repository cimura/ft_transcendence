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
    <div className="space-page min-h-screen">
      <header className="console-header">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          {isTopLevel ? (
            <button
              onClick={() => navigate('/home')}
              className="console-button console-button--muted order-2 px-4 py-2 text-xs"
            >
              CLOSE
            </button>
          ) : (
            <button
              onClick={() => navigate('/settings')}
              className="console-button console-button--muted order-2 px-4 py-2 text-xs"
            >
              BACK TO SETTINGS
            </button>
          )}

          <div>
            <p className="console-kicker">GALACTIC GAME NETWORK / CONFIG</p>
            <h1 className="console-title">
              {isTopLevel ? 'SETTINGS' : 'DETAIL SETTINGS'}
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
        <div className="console-panel p-5 sm:p-8">
          <Outlet context={{ onLogout } satisfies SettingsOutletContext} />
        </div>
      </main>
    </div>
  )
}

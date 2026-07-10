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
    <div className="space-page">
      <header className="console-header">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <div>
            <p className="console-kicker">GALACTIC GAME NETWORK / LOCAL TERMINAL</p>
            <h1 className="console-title">PAN-GALACTIC ARCADE</h1>
          </div>
          <div className="hidden text-right text-xs font-bold tracking-wider text-emerald-100/60 sm:block">
            <p>STATUS: AVAILABLE</p>
            <p>COORDINATES: 42.000</p>
          </div>
        </div>
      </header>
      <main className="mx-auto grid min-h-[calc(100svh-112px)] max-w-6xl items-center px-5 py-10 sm:px-8">
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <section className="console-panel p-6 sm:p-8">
            <p className="console-kicker">PRIMARY DESTINATION</p>
            <h2 className="mt-1 text-3xl font-black tracking-wide text-white sm:text-4xl">
              GAME LOBBY
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-emerald-100/70">
              Match with nearby life forms, create a room, and keep an eye on
              your towel.
            </p>
            <button onClick={() => navigate('/lobby')} className="nav-action mt-7 px-5 py-3 text-sm">
              OPEN LOBBY
            </button>
          </section>

          <section className="console-panel console-panel--subtle grid grid-cols-2 gap-px overflow-hidden bg-emerald-300/20">
            <HomeAction label="MY PROFILE" code="ID" onClick={handleMyProfileClick} disabled={loading} />
            <HomeAction label="FRIENDS" code="FR" onClick={() => navigate('/friends')} />
            <HomeAction label="NOTICES" code="NT" count={notifications.length} onClick={() => navigate('/notifications')} />
            <HomeAction label="SETTINGS" code="CFG" onClick={() => navigate('/settings')} />
          </section>
        </div>
      </main>
    </div>
  )
}

function HomeAction({
  label,
  code,
  count,
  disabled,
  onClick,
}: {
  label: string
  code: string
  count?: number
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="relative min-h-36 bg-[#08231e] p-5 text-left transition-colors hover:bg-[#123a31] disabled:opacity-50"
    >
      <span className="block text-xs font-bold tracking-widest text-[#b8ff64]">{code}</span>
      <span className="mt-9 block text-lg font-bold tracking-wide text-white">{label}</span>
      {count ? (
        <span className="absolute right-4 top-4 border border-[#ff7669] bg-[#4d2422] px-2 py-1 text-xs font-bold text-[#ffd6d2]">
          {count}
        </span>
      ) : null}
    </button>
  )
}

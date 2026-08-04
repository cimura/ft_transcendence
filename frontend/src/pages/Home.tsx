import { useNavigate } from 'react-router-dom'
import { useCurrentUser } from '../stores/authStore'
import { useNotifications } from '../hooks/useNotifications'

const signalBars = [
  { height: '35%', opacity: 0.45 },
  { height: '70%', opacity: 0.8 },
  { height: '50%', opacity: 0.6 },
  { height: '90%', opacity: 0.95 },
  { height: '62%', opacity: 0.7 },
  { height: '28%', opacity: 0.4 },
  { height: '78%', opacity: 0.85 },
  { height: '44%', opacity: 0.55 },
  { height: '100%', opacity: 1 },
  { height: '56%', opacity: 0.65 },
  { height: '82%', opacity: 0.9 },
  { height: '38%', opacity: 0.5 },
  { height: '68%', opacity: 0.75 },
  { height: '48%', opacity: 0.58 },
  { height: '88%', opacity: 0.92 },
]

type HomeNavItem = {
  id: string
  label: string
  sub: string
  path: string
  badge?: number
}

/**
 * Renders the home dashboard with navigation to profile, friends, lobby, notifications, rankings, and settings.
 */
export function Home() {
  const navigate = useNavigate()
  const currentUser = useCurrentUser()
  const { notifications } = useNotifications()
  const navItems: HomeNavItem[] = [
    {
      id: 'notifications',
      label: '通知',
      sub: 'ALERTS',
      path: '/notifications',
      badge: notifications.length,
    },
    {
      id: 'rankings',
      label: 'ランキング',
      sub: 'RANKING',
      path: '/rankings',
    },
    {
      id: 'settings',
      label: '設定',
      sub: 'SETTINGS',
      path: '/settings',
    },
  ]

  const handleMyProfileClick = () => {
    navigate(`/profile/${currentUser.id}`)
  }

  const handleStartMatchClick = () => {
    navigate('/lobby')
  }

  return (
    <div className="relative min-h-screen bg-transparent flex items-center justify-center overflow-hidden font-sans text-cyan-50 select-none">
      <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,255,255,0.05)_50%)] bg-[size:100%_4px] pointer-events-none z-50" />
      <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-cyan-500/20 to-transparent pointer-events-none z-40" />

      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.1)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-cyan-400/20 rounded-full shadow-[0_0_50px_rgba(0,255,255,0.1)]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-cyan-400/30 rounded-full border-dashed" />
      </div>

      <div className="absolute top-0 inset-x-0 h-12 bg-black/30 backdrop-blur-md border-b border-cyan-400/60 flex justify-between items-center px-8 z-30 shadow-[0_4px_20px_rgba(0,255,255,0.2)]">
        <div className="flex gap-6 items-center">
          <span className="text-red-400 font-bold text-xs tracking-widest animate-pulse flex items-center gap-2 drop-shadow-[0_0_5px_rgba(255,0,0,0.8)]">
            <span className="w-2 h-2 bg-red-400 rounded-full" /> LIVE
          </span>
          <span className="font-mono text-[10px] text-cyan-300 tracking-widest">
            SYS_OS // VER.4.2.0
          </span>
        </div>
        <div className="flex gap-1 items-end h-4 opacity-80">
          {signalBars.map((bar, i) => (
            <div
              key={i}
              className="w-1.5 bg-cyan-300"
              style={{
                height: bar.height,
                opacity: bar.opacity,
              }}
            />
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 h-10 bg-black/30 backdrop-blur-md border-t border-cyan-400/60 flex justify-between items-center px-8 z-30 shadow-[0_-4px_20px_rgba(0,255,255,0.2)]">
        <span className="font-mono text-[10px] text-cyan-300 tracking-[0.3em]">
          LOCAL_IP // 192.168.XXX.XXX
        </span>
        <div className="flex gap-2">
          <div className="w-8 h-1 bg-cyan-400/30">
            <div className="w-full h-full bg-cyan-300 animate-pulse" />
          </div>
          <div className="w-8 h-1 bg-cyan-400/30">
            <div className="w-1/2 h-full bg-cyan-300" />
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-8 w-full max-w-5xl p-8 relative z-10 mt-4">
        <div className="flex w-full justify-between gap-12 px-8 relative">
          <button
            onClick={handleMyProfileClick}
            className="group relative flex-1 bg-cyan-900/30 backdrop-blur-md p-1 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,255,255,0.3)] hover:bg-cyan-800/40"
            style={{
              clipPath:
                'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)',
            }}
          >
            <div
              className="bg-gradient-to-b from-cyan-600/30 to-blue-900/30 h-full w-full py-5 px-6 flex flex-col items-start relative border border-cyan-400/60 group-hover:border-cyan-300 transition-colors"
              style={{
                clipPath:
                  'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
              }}
            >
              <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_5px_rgba(0,255,255,0.8)]" />
              <div className="absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_5px_rgba(0,255,255,0.8)]" />

              <span className="text-[10px] text-cyan-300 font-mono tracking-[0.2em] mb-1 font-bold drop-shadow-md">
                ID_CARD //
              </span>
              <span className="text-2xl font-bold text-white tracking-widest drop-shadow-md group-hover:text-white transition-colors">
                マイプロフィール
              </span>
            </div>
          </button>

          <button
            onClick={() => navigate('/friends')}
            className="group relative flex-1 bg-cyan-900/30 backdrop-blur-md p-1 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,255,255,0.3)] hover:bg-cyan-800/40"
            style={{
              clipPath:
                'polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 15px 100%, 0 calc(100% - 15px))',
            }}
          >
            <div
              className="bg-gradient-to-b from-cyan-600/30 to-blue-900/30 h-full w-full py-5 px-6 flex flex-col items-end relative border border-cyan-400/60 group-hover:border-cyan-300 transition-colors"
              style={{
                clipPath:
                  'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
              }}
            >
              <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_5px_rgba(0,255,255,0.8)]" />
              <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_5px_rgba(0,255,255,0.8)]" />

              <span className="text-[10px] text-cyan-300 font-mono tracking-[0.2em] mb-1 font-bold drop-shadow-md">
                // RADAR_LINK
              </span>
              <span className="text-2xl font-bold text-white tracking-widest drop-shadow-md group-hover:text-white transition-colors">
                フレンド
              </span>
            </div>
          </button>
        </div>

        <div className="relative w-full max-w-2xl my-6">
          <div className="absolute -inset-1.5 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(251,191,36,0.6)_10px,rgba(251,191,36,0.6)_20px)] rounded-[2rem] blur-[1px] group-hover:opacity-100 transition-opacity" />

          <button
            onClick={handleStartMatchClick}
            className="group relative w-full bg-black/40 backdrop-blur-xl border-2 border-cyan-300/80 rounded-[2rem] py-14 flex flex-col items-center justify-center overflow-hidden transition-all duration-500 hover:scale-[1.02] disabled:opacity-50"
            style={{
              boxShadow:
                'inset 0 0 30px rgba(0, 255, 255, 0.2), 0 0 30px rgba(0, 255, 255, 0.4)',
            }}
          >
            <div className="absolute inset-2 border border-cyan-400/50 rounded-[1.5rem] bg-gradient-to-b from-cyan-600/30 to-blue-900/40 pointer-events-none" />

            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-300/40 to-transparent -translate-y-full group-hover:translate-y-full transition-transform duration-1000 ease-in-out" />

            <span className="text-yellow-300 font-mono text-xs font-bold tracking-[0.5em] mb-3 relative z-10 flex items-center gap-2 drop-shadow-md">
              <span className="w-2 h-2 bg-yellow-300 rotate-45 animate-ping" />{' '}
              MAIN ENGINE IGNITION
            </span>

            <span className="relative z-10 text-6xl font-black text-white tracking-[0.2em] group-hover:tracking-[0.3em] transition-all duration-500 drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]">
              対戦開始
            </span>

            <div className="absolute bottom-4 inset-x-8 flex items-end justify-between opacity-80">
              <div className="font-mono text-[8px] font-bold text-cyan-300 tracking-widest">
                AUTH: ACCEPTED
              </div>
              <div className="flex gap-1">
                <div className="w-1 h-2 bg-cyan-300" />
                <div className="w-2 h-3 bg-cyan-300" />
                <div className="w-1 h-4 bg-cyan-300 animate-pulse" />
                <div className="w-3 h-2 bg-cyan-300" />
              </div>
              <div className="font-mono text-[8px] font-bold text-cyan-300 tracking-widest">
                SEQ: 001100
              </div>
            </div>
          </button>
        </div>

        <div className="flex w-full justify-center gap-6 px-10">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className="group relative flex-1 bg-cyan-950/40 backdrop-blur-md border border-cyan-400/60 py-4 px-6 flex flex-col items-center justify-center transition-all duration-300 hover:border-cyan-300 hover:bg-cyan-800/60 hover:shadow-[0_5px_20px_rgba(0,255,255,0.4)] hover:-translate-y-1"
              style={{
                clipPath:
                  'polygon(10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px), 0 10px)',
              }}
            >
              <div className="absolute top-1 left-1 w-1 h-1 bg-cyan-300 rounded-full shadow-[0_0_5px_rgba(0,255,255,0.8)]" />
              <div className="absolute top-1 right-1 w-1 h-1 bg-cyan-300 rounded-full shadow-[0_0_5px_rgba(0,255,255,0.8)]" />

              <span className="text-[10px] text-cyan-300 font-bold font-mono tracking-widest mb-1 drop-shadow-sm">
                {item.sub}
              </span>
              <span className="text-xl font-bold text-white tracking-widest drop-shadow-md transition-colors">
                {item.label}
              </span>

              {item.badge ? (
                <span
                  className="absolute top-0 right-0 flex h-6 min-w-6 items-center justify-center bg-red-500 px-2 text-xs font-bold text-white border-l border-b border-red-400 animate-pulse shadow-[0_0_10px_rgba(255,0,0,0.5)]"
                  style={{
                    clipPath:
                      'polygon(0 0, 100% 0, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
                  }}
                >
                  {item.badge}
                </span>
              ) : null}

              <div className="absolute bottom-1 w-8 h-1 bg-cyan-500/50 group-hover:bg-cyan-300 group-hover:shadow-[0_0_10px_rgba(0,255,255,0.8)] transition-all duration-300" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

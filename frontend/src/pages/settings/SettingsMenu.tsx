import { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { LegalLinks } from '../../components/legal/LegalLinks'
import type { SettingsOutletContext } from './Settings'

export const SettingsMenu = () => {
  const navigate = useNavigate()
  const { onLogout } = useOutletContext<SettingsOutletContext>()
  const logout = useAuthStore((state) => state.logout)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)

    try {
      await logout()
    } catch {
      // The auth store still clears local session state when the API is unavailable.
    } finally {
      setIsLoggingOut(false)
      onLogout()
    }
  }

  return (
    <div className="grid gap-5">
      <button
        onClick={() => navigate('account')}
        // サイバー風のパネルボタン
        className="group relative flex w-full items-center justify-between rounded-xl border border-cyan-500/30 bg-black/40 backdrop-blur-sm px-6 py-5 text-left font-bold text-cyan-100 transition-all duration-300 hover:border-cyan-300 hover:bg-cyan-950/40 hover:shadow-[0_0_15px_rgba(0,255,255,0.2)] hover:-translate-y-0.5"
      >
        <span className="tracking-wider">アカウント管理</span>
        <span className="text-cyan-500/50 group-hover:text-cyan-300 group-hover:translate-x-1 transition-all">
          &gt;
        </span>
      </button>

      {/* チームが追加した法的リンク（利用規約など） */}
      <LegalLinks variant="menu" />

      {/* ログアウトは危険な操作なので赤く発光させる */}
      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="mt-4 w-full rounded-xl border border-red-500/50 bg-red-950/30 backdrop-blur-sm px-6 py-5 font-bold tracking-widest text-red-300 transition-all duration-300 hover:border-red-400 hover:bg-red-900/40 hover:shadow-[0_0_15px_rgba(255,0,0,0.3)] hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoggingOut ? 'DISCONNECTING...' : 'ログアウト'}
      </button>
    </div>
  )
}

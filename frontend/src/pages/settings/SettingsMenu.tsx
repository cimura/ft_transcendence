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

  const baseButtonClass =
    'flex w-full items-center justify-between rounded-md border border-white/10 bg-white/5 px-6 py-4 text-left font-medium text-white transition-colors hover:bg-white/10'

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
    <div className="grid gap-4">
      <button onClick={() => navigate('account')} className={baseButtonClass}>
        <span>アカウント管理</span>
        <span className="text-white/50">＞</span>
      </button>

      <LegalLinks variant="menu" />

      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="w-full rounded-md border border-red-900/50 bg-red-900/10 px-6 py-4 font-medium text-red-400 transition-colors hover:bg-red-900/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoggingOut ? 'ログアウト中...' : 'ログアウト'}
      </button>
    </div>
  )
}

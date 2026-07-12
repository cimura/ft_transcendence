import { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import type { SettingsOutletContext } from './Settings'

export const SettingsMenu = () => {
  const navigate = useNavigate()
  const { onLogout } = useOutletContext<SettingsOutletContext>()
  const logout = useAuthStore((state) => state.logout)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const baseButtonClass =
    'console-button console-button--muted flex w-full items-center justify-between px-5 py-4 text-left'

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

      <button
        onClick={() => navigate('notifications')}
        className={baseButtonClass}
      >
        <span>通知設定</span>
        <span className="text-white/50">＞</span>
      </button>

      <button onClick={() => navigate('privacy')} className={baseButtonClass}>
        <span>プライバシー</span>
        <span className="text-white/50">＞</span>
      </button>

      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="console-button console-button--danger w-full px-5 py-4 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoggingOut ? 'ログアウト中...' : 'ログアウト'}
      </button>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import type { User } from '../../types/user'
import { useAuthStore } from '../../stores/authStore'
import { AccountInfoModal } from './AccountInfoModal'
import { DeleteAccountModal } from './DeleteAccountModal'
import { PasswordChangeModal } from './PasswordChangeModal'
import type { SettingsOutletContext } from './Settings'

type OpenModal = 'account' | 'password' | 'delete' | null

export const AccountManagement = () => {
  const { onLogout } = useOutletContext<SettingsOutletContext>()
  const { currentUser, loading, error, fetchCurrentUser, setCurrentUser } =
    useAuthStore()
  const [openModal, setOpenModal] = useState<OpenModal>(null)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!currentUser && !loading && !error) {
      void fetchCurrentUser()
    }
  }, [currentUser, error, fetchCurrentUser, loading])

  const closeModal = () => setOpenModal(null)
  const hasCurrentUser = currentUser !== null
  const disableAccountActions = loading || !hasCurrentUser

  const handleRetryFetchCurrentUser = () => {
    setSuccess('')
    void fetchCurrentUser()
  }

  const handleAccountUpdateSuccess = (user: User, message: string) => {
    setCurrentUser(user)
    setSuccess(message)
    closeModal()
  }

  const handlePasswordUpdateSuccess = (message: string) => {
    setSuccess(message)
    closeModal()
  }

  return (
    <div className="space-y-6">
      {currentUser && (
        // ユーザー情報のディスプレイ部分（HUD風）
        <div className="relative rounded-xl border border-cyan-500/30 bg-black/40 backdrop-blur-sm p-6 overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500 shadow-[0_0_10px_rgba(0,255,255,0.8)]" />
          <p className="text-xs font-bold tracking-widest text-cyan-400/60 mb-1">
            USER ID / NAME
          </p>
          <p className="text-2xl font-bold tracking-wider text-cyan-100 mb-4">
            {currentUser.username}
          </p>
          <p className="text-xs font-bold tracking-widest text-cyan-400/60 mb-1">
            COMMUNICATION LINK
          </p>
          <p className="text-cyan-200/80 font-mono text-sm">
            {currentUser.email}
          </p>
        </div>
      )}

      {!currentUser && loading && (
        <div
          role="status"
          className="rounded-xl border border-cyan-500/30 bg-black/40 p-6 text-sm text-cyan-100/60 animate-pulse text-center"
        >
          スキャン中...
        </div>
      )}

      {!currentUser && error && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/40 bg-red-950/30 p-6 backdrop-blur-sm"
        >
          <p className="text-sm font-bold tracking-wider text-red-300">
            [ERROR] アカウント情報の取得に失敗しました
          </p>
          <p className="mt-2 text-sm text-red-200/60">{error}</p>
          <button
            onClick={handleRetryFetchCurrentUser}
            disabled={loading}
            className="mt-4 rounded-md border border-red-500/50 bg-red-900/40 px-6 py-2 text-sm font-bold text-red-200 hover:bg-red-800/50 hover:shadow-[0_0_10px_rgba(255,0,0,0.3)] transition-all disabled:opacity-50"
          >
            {loading ? 'RETRYING...' : '再試行'}
          </button>
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-xl border border-green-500/40 bg-green-950/30 p-4 text-sm font-bold tracking-wider text-green-300 shadow-[0_0_15px_rgba(0,255,0,0.1)]"
        >
          {success}
        </div>
      )}

      <div className="grid gap-4 pt-4">
        <button
          onClick={() => {
            setSuccess('')
            setOpenModal('account')
          }}
          disabled={disableAccountActions}
          className="w-full rounded-xl border border-cyan-500/30 bg-black/40 backdrop-blur-sm p-4 font-bold tracking-wider text-cyan-100 transition-all hover:border-cyan-300 hover:bg-cyan-950/40 hover:shadow-[0_0_15px_rgba(0,255,255,0.2)] hover:-translate-y-0.5 disabled:opacity-50"
        >
          アカウント情報変更
        </button>
        <button
          onClick={() => {
            setSuccess('')
            setOpenModal('password')
          }}
          disabled={disableAccountActions}
          className="w-full rounded-xl border border-cyan-500/30 bg-black/40 backdrop-blur-sm p-4 font-bold tracking-wider text-cyan-100 transition-all hover:border-cyan-300 hover:bg-cyan-950/40 hover:shadow-[0_0_15px_rgba(0,255,255,0.2)] hover:-translate-y-0.5 disabled:opacity-50"
        >
          パスワード変更
        </button>
        <button
          onClick={() => {
            setSuccess('')
            setOpenModal('delete')
          }}
          disabled={disableAccountActions}
          className="mt-4 w-full rounded-xl border border-red-500/50 bg-red-950/30 backdrop-blur-sm p-4 font-bold tracking-widest text-red-300 transition-all hover:border-red-400 hover:bg-red-900/40 hover:shadow-[0_0_15px_rgba(255,0,0,0.3)] hover:-translate-y-0.5 disabled:opacity-50"
        >
          アカウント削除
        </button>
      </div>

      {openModal === 'account' && currentUser && (
        <AccountInfoModal
          currentUser={currentUser}
          onClose={closeModal}
          onSuccess={handleAccountUpdateSuccess}
        />
      )}

      {openModal === 'password' && (
        <PasswordChangeModal
          onClose={closeModal}
          onSuccess={handlePasswordUpdateSuccess}
        />
      )}

      {openModal === 'delete' && (
        <DeleteAccountModal onClose={closeModal} onDeleted={onLogout} />
      )}
    </div>
  )
}

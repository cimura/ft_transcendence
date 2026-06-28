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
        <div className="rounded-md border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-white/60">ユーザー名</p>
          <p className="text-xl font-bold text-white">{currentUser.username}</p>
          <p className="mt-3 text-sm text-white/60">メールアドレス</p>
          <p className="text-white">{currentUser.email}</p>
        </div>
      )}

      {!currentUser && loading && (
        <div className="rounded-md border border-white/10 bg-white/5 p-6 text-sm text-white/60">
          アカウント情報を読み込み中...
        </div>
      )}

      {!currentUser && error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-6">
          <p className="text-sm font-semibold text-red-200">
            アカウント情報の取得に失敗しました。
          </p>
          <p className="mt-2 text-sm text-red-100/80">{error}</p>
          <button
            onClick={handleRetryFetchCurrentUser}
            disabled={loading}
            className="mt-4 rounded-md border border-red-500/40 bg-red-600/20 px-4 py-2 text-sm text-red-100 hover:bg-red-600/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? '再試行中...' : '再試行'}
          </button>
        </div>
      )}

      {success && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          {success}
        </div>
      )}

      <button
        onClick={() => {
          setSuccess('')
          setOpenModal('account')
        }}
        disabled={disableAccountActions}
        className="w-full rounded-md border border-white/10 bg-white/5 p-4 text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        アカウント情報変更
      </button>
      <button
        onClick={() => {
          setSuccess('')
          setOpenModal('password')
        }}
        disabled={disableAccountActions}
        className="w-full rounded-md border border-white/10 bg-white/5 p-4 text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        パスワード変更
      </button>
      <button
        onClick={() => {
          setSuccess('')
          setOpenModal('delete')
        }}
        disabled={disableAccountActions}
        className="w-full rounded-md border border-red-900/50 bg-red-900/20 p-4 text-red-400 hover:bg-red-900/30 disabled:cursor-not-allowed disabled:opacity-60"
      >
        アカウント削除
      </button>

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

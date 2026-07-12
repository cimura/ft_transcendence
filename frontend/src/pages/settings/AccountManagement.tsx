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
        <div className="console-panel console-panel--subtle p-6">
          <p className="console-kicker">CURRENT IDENTITY</p>
          <p className="text-xl font-bold text-white">{currentUser.username}</p>
          <p className="mt-3 text-sm text-emerald-100/60">メールアドレス</p>
          <p className="text-emerald-50/85">{currentUser.email}</p>
        </div>
      )}

      {!currentUser && loading && (
        <div className="console-panel console-panel--subtle p-6 text-sm text-emerald-100/60">
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
            className="console-button console-button--danger mt-4 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? '再試行中...' : '再試行'}
          </button>
        </div>
      )}

      {success && (
        <div className="border border-[#b8ff64]/30 bg-[#b8ff64]/10 p-4 text-sm text-[#d2ff8c]">
          {success}
        </div>
      )}

      <button
        onClick={() => {
          setSuccess('')
          setOpenModal('account')
        }}
        disabled={disableAccountActions}
        className="console-button console-button--muted w-full p-4 text-left disabled:cursor-not-allowed disabled:opacity-60"
      >
        アカウント情報変更
      </button>
      <button
        onClick={() => {
          setSuccess('')
          setOpenModal('password')
        }}
        disabled={disableAccountActions}
        className="console-button console-button--muted w-full p-4 text-left disabled:cursor-not-allowed disabled:opacity-60"
      >
        パスワード変更
      </button>
      <button
        onClick={() => {
          setSuccess('')
          setOpenModal('delete')
        }}
        disabled={disableAccountActions}
        className="console-button console-button--danger w-full p-4 text-left disabled:cursor-not-allowed disabled:opacity-60"
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

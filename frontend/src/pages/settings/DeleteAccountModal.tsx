import { useState } from 'react'
import { getApiErrorMessage } from '../../api/errors'
import { deleteMe } from '../../api/user'
import { useAuthStore } from '../../stores/authStore'
import { SettingsFormError } from './SettingsFormError'
import { SettingsModal } from './SettingsModal'

interface DeleteAccountModalProps {
  onClose: () => void
  onDeleted: () => void
}

export const DeleteAccountModal = ({
  onClose,
  onDeleted,
}: DeleteAccountModalProps) => {
  const { setCurrentUser, setAccessToken } = useAuthStore()
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (deleteConfirm !== '削除') {
      setError('確認のため「削除」と入力してください。')
      return
    }

    setLoading(true)
    setError('')

    try {
      await deleteMe()
      setCurrentUser(null)
      setAccessToken(null)
      onDeleted()
    } catch (err) {
      setError(getApiErrorMessage(err, '退会に失敗しました。'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <SettingsModal
      title="アカウント削除"
      closeLabel="退会画面を閉じる"
      danger
      onClose={onClose}
    >
      <p id="delete-confirm-help" className="mb-4 text-sm text-white/70">
        退会するとアカウントは削除されます。確認のため「削除」と入力してください。
      </p>
      <SettingsFormError message={error} className="mb-4" />

      <label
        htmlFor="delete-confirm"
        className="mb-2 block text-sm text-white/70"
      >
        確認のため「削除」と入力してください
      </label>

      <input
        id="delete-confirm"
        aria-describedby="delete-confirm-help"
        type="text"
        value={deleteConfirm}
        onChange={(e) => setDeleteConfirm(e.target.value)}
        className="mb-5 w-full rounded-md border border-white/10 bg-white/5 px-4 py-3 text-white outline-none ring-0 focus:border-red-500/60"
      />

      <div className="flex gap-3">
        <button
          onClick={onClose}
          disabled={loading}
          className="flex-1 rounded-md border border-white/10 bg-white/5 px-4 py-3 text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          キャンセル
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 rounded-md border border-red-500/40 bg-red-600/20 px-4 py-3 text-red-100 hover:bg-red-600/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? '削除中...' : '削除する'}
        </button>
      </div>
    </SettingsModal>
  )
}

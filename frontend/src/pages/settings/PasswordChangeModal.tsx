import { useState } from 'react'
import { getApiErrorMessage } from '../../api/errors'
import { updateMe } from '../../api/user'
import { SettingsFormError } from './SettingsFormError'
import { SettingsModal } from './SettingsModal'

interface PasswordChangeModalProps {
  onClose: () => void
  onSuccess: (message: string) => void
}

export const PasswordChangeModal = ({
  onClose,
  onSuccess,
}: PasswordChangeModalProps) => {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('現在のパスワードと新しいパスワードを入力してください。')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('新しいパスワードが一致しません。')
      return
    }

    if (newPassword.length < 8) {
      setError('新しいパスワードは8文字以上で入力してください。')
      return
    }

    setLoading(true)
    setError('')

    try {
      await updateMe({
        currentPassword,
        password: newPassword,
      })

      onSuccess('パスワードを更新しました。')
    } catch (err) {
      setError(getApiErrorMessage(err, 'パスワード変更に失敗しました。'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <SettingsModal
      title="パスワード変更"
      closeLabel="パスワード変更画面を閉じる"
      onClose={onClose}
    >
      <div className="space-y-4">
        <SettingsFormError message={error} />

        <label className="block">
          <span className="mb-2 block text-sm text-white/70">
            現在のパスワード
          </span>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-white/5 px-4 py-3 text-white outline-none ring-0 placeholder:text-white/30 focus:border-blue-500/60"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-white/70">
            新しいパスワード
          </span>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={6}
            className="w-full rounded-md border border-white/10 bg-white/5 px-4 py-3 text-white outline-none ring-0 placeholder:text-white/30 focus:border-blue-500/60"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-white/70">
            新しいパスワード確認
          </span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={6}
            className="w-full rounded-md border border-white/10 bg-white/5 px-4 py-3 text-white outline-none ring-0 placeholder:text-white/30 focus:border-blue-500/60"
          />
        </label>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-white/10 bg-white/5 px-4 py-3 text-white hover:bg-white/10"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 rounded-md border border-blue-500/40 bg-blue-600/20 px-4 py-3 text-blue-100 hover:bg-blue-600/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? '更新中...' : '保存'}
          </button>
        </div>
      </div>
    </SettingsModal>
  )
}

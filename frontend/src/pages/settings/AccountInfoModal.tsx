import { useState } from 'react'
import { getApiErrorMessage } from '../../api/errors'
import { updateMe } from '../../api/user'
import type { User } from '../../types/user'
import { SettingsFormError } from './SettingsFormError'
import { SettingsModal } from './SettingsModal'

interface AccountInfoModalProps {
  currentUser: User
  onClose: () => void
  onSuccess: (user: User, message: string) => void
}

export const AccountInfoModal = ({
  currentUser,
  onClose,
  onSuccess,
}: AccountInfoModalProps) => {
  const [email, setEmail] = useState(currentUser.email)
  const [username, setUsername] = useState(currentUser.username)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    const trimmedEmail = email.trim()
    const trimmedUsername = username.trim()

    if (!trimmedEmail) {
      setError('メールアドレスを入力してください。')
      return
    }

    if (!trimmedUsername) {
      setError('ユーザー名を入力してください。')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      setError('メールアドレスの形式が正しくありません。')
      return
    }

    const usernameRegex = /^[a-zA-Z0-9_-]+$/
    if (!usernameRegex.test(trimmedUsername)) {
      setError('ユーザー名は英数字、アンダースコア、ハイフンのみ使用できます。')
      return
    }

    if (
      trimmedEmail === currentUser.email &&
      trimmedUsername === currentUser.username
    ) {
      setError('変更前と同じ内容です。')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await updateMe({
        email: trimmedEmail !== currentUser.email ? trimmedEmail : undefined,
        username:
          trimmedUsername !== currentUser.username
            ? trimmedUsername
            : undefined,
      })

      onSuccess(
        {
          ...currentUser,
          email: response.user.email,
          username: response.user.username,
          displayName: response.user.displayName ?? currentUser.displayName,
          avatarUrl: response.user.avatarUrl ?? currentUser.avatarUrl,
          createdAt: new Date(response.user.createdAt),
          updatedAt: new Date(response.user.updatedAt),
        },
        'アカウント情報を更新しました。'
      )
    } catch (err) {
      setError(getApiErrorMessage(err, '更新に失敗しました。'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <SettingsModal
      title="アカウント情報変更"
      closeLabel="変更画面を閉じる"
      onClose={onClose}
    >
      <div className="space-y-4">
        <SettingsFormError message={error} />

        <label className="block">
          <span className="mb-2 block text-sm text-white/70">
            メールアドレス
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-white/5 px-4 py-3 text-white outline-none ring-0 placeholder:text-white/30 focus:border-blue-500/60"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-white/70">ユーザー名</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
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

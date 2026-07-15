import { useState } from 'react'
import { Modal } from '../common/Modal'
import { AvatarUpload } from './AvatarUpload'
import { DefaultAvatarSelector } from './DefaultAvatarSelector'
import { useUploadAvatar } from '../../hooks/useProfile'
import type { UserProfile } from '../../types/user'

interface ProfileEditModalProps {
  isOpen: boolean
  onClose: () => void
  profile: UserProfile
  onSuccess: (updatedProfile: UserProfile) => void
}

export const ProfileEditModal = ({
  isOpen,
  onClose,
  profile,
  onSuccess,
}: ProfileEditModalProps) => {
  const [displayName, setDisplayName] = useState(profile.displayName || '')
  const [selectedDefaultAvatar, setSelectedDefaultAvatar] = useState<
    string | null
  >(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  const {
    uploadAvatar,
    setDefaultAvatar,
    loading: avatarLoading,
    error: avatarError,
  } = useUploadAvatar()

  const handleSave = async () => {
    try {
      // アバターの更新
      let newAvatarUrl: string | null = null
      if (uploadedFile) {
        // カスタム画像のアップロード
        const updatedProfile = await uploadAvatar(uploadedFile)
        if (!updatedProfile) return
        newAvatarUrl = updatedProfile.avatarUrl || null
      } else if (selectedDefaultAvatar) {
        // デフォルトアバターの設定
        newAvatarUrl = await setDefaultAvatar(selectedDefaultAvatar)
        if (!newAvatarUrl) return
      }

      // 成功時のコールバック
      const updatedProfile: UserProfile = {
        ...profile,
        avatarUrl: newAvatarUrl || profile.avatarUrl,
      }
      onSuccess(updatedProfile)
      onClose()
    } catch (error) {
      console.error('Failed to update profile:', error)
    }
  }

  const handleClose = () => {
    setDisplayName(profile.displayName || '')
    setSelectedDefaultAvatar(null)
    setUploadedFile(null)
    onClose()
  }

  const isLoading = avatarLoading
  const error = avatarError

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="bg-black/95 rounded-3xl border-2 border-white/30 p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-3xl font-bold text-white mb-6">プロフィール編集</h2>

        {/* DisplayName編集 */}
        <div className="mb-6">
          <label className="block text-white font-semibold mb-2">表示名</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
            className="w-full px-4 py-2 bg-black/60 border-2 border-white/40
                     rounded-full text-white placeholder-white/40
                     focus:outline-none focus:border-white/60 transition-all"
            placeholder="表示名を入力"
          />
          <p className="text-white/40 text-xs mt-1">
            {displayName.length}/50文字
          </p>
        </div>

        {/* アバター変更 */}
        <div className="mb-6">
          <AvatarUpload
            currentAvatar={profile.avatarUrl}
            onUpload={setUploadedFile}
            error={avatarError}
          />
        </div>

        <div className="mb-6">
          <DefaultAvatarSelector
            selectedAvatar={selectedDefaultAvatar}
            onSelect={setSelectedDefaultAvatar}
          />
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* アクションボタン */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-6 py-2 bg-white/10 text-white rounded-full border-2 border-white/40
                     hover:bg-white/20 hover:border-white/60 transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-6 py-2 bg-green-600 text-white rounded-full font-semibold
                     hover:bg-green-700 transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

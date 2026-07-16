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
      let newAvatarUrl: string | null = null
      if (uploadedFile) {
        const updatedProfile = await uploadAvatar(uploadedFile)
        if (!updatedProfile) return
        newAvatarUrl = updatedProfile.avatarUrl || null
      } else if (selectedDefaultAvatar) {
        newAvatarUrl = await setDefaultAvatar(selectedDefaultAvatar)
        if (!newAvatarUrl) return
      }

      const updatedProfile: UserProfile = {
        ...profile,
        displayName,
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
    <Modal isOpen={isOpen} onClose={handleClose} className="w-full max-w-2xl bg-transparent p-0">
      <div 
        className="relative bg-black/50 backdrop-blur-xl border border-cyan-500/50 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-[0_0_40px_rgba(0,255,255,0.15)] flex flex-col"
        style={{ clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)' }}
      >
        
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.1)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-cyan-400/20 rounded-full shadow-[0_0_50px_rgba(0,255,255,0.1)]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-cyan-400/30 rounded-full border-dashed" />
        </div>

        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,255,255,0.05)_50%)] bg-[size:100%_4px] pointer-events-none z-40" />
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-cyan-500/20 to-transparent pointer-events-none z-30" />

        <div className="absolute top-0 inset-x-0 h-10 bg-black/30 backdrop-blur-md border-b border-cyan-400/60 flex justify-between items-center px-6 z-50">
          <span className="text-red-400 font-bold text-xs tracking-widest animate-pulse flex items-center gap-2 drop-shadow-[0_0_5px_rgba(255,0,0,0.8)]">
            <span className="w-2 h-2 bg-red-400 rounded-full" /> LIVE
          </span>
          <span className="font-mono text-[9px] text-cyan-300 tracking-widest">USER_OS // VER.1.0.0</span>
        </div>

        <div className="relative z-10 flex-1 p-8 pt-16 pb-24">
          
          <div className="flex items-center gap-3 mb-6 border-b border-cyan-500/30 pb-4">
            <span className="w-2 h-6 bg-cyan-400 rounded-sm shadow-[0_0_10px_rgba(0,255,255,0.8)] animate-pulse" />
            <div>
              <h2 className="text-2xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-cyan-300">
                プロフィール編集
              </h2>
              <p className="text-[10px] font-mono tracking-[0.3em] text-cyan-500 mt-1">USER_DATA_CONFIG // EDIT_MODE</p>
            </div>
          </div>

          <div className="mb-8 p-5 rounded-xl border border-cyan-900/50 bg-cyan-950/20 relative">
            <label className="flex items-center gap-2 text-cyan-400 font-mono text-xs tracking-widest mb-3">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" /> DISPLAY_NAME
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              className="w-full px-4 py-3 bg-black/50 border border-cyan-700/80 rounded-lg text-cyan-100 font-bold tracking-wider placeholder-cyan-800 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all shadow-[inset_0_0_10px_rgba(0,255,255,0.05)]"
              placeholder="新しい表示名を入力..."
            />
            <p className="text-cyan-600/60 font-mono text-[10px] mt-2 text-right tracking-widest">
              LENGTH: {displayName.length}/50
            </p>
          </div>

          <div className="mb-6 p-5 rounded-xl border border-cyan-900/50 bg-cyan-950/20 relative">
            <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_5px_rgba(0,255,255,0.8)]" />
            <div className="absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_5px_rgba(0,255,255,0.8)]" />

            <label className="flex items-center gap-2 text-cyan-400 font-mono text-xs tracking-widest mb-4">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" /> CUSTOM_AVATAR_UPLOAD
            </label>
            <AvatarUpload
              currentAvatar={profile.avatarUrl}
              onUpload={setUploadedFile}
              error={avatarError}
            />
          </div>

          <div className="mb-8 p-5 rounded-xl border border-cyan-900/50 bg-cyan-950/20 relative">
            {/* 四隅のリベット */}
            <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_5px_rgba(0,255,255,0.8)]" />
            <div className="absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_5px_rgba(0,255,255,0.8)]" />

            <label className="flex items-center gap-2 text-cyan-400 font-mono text-xs tracking-widest mb-4">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" /> DEFAULT_AVATAR_SELECT
            </label>
            <DefaultAvatarSelector
              selectedAvatar={selectedDefaultAvatar}
              onSelect={setSelectedDefaultAvatar}
            />
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-950/40 border border-red-500/50 rounded-lg backdrop-blur-sm flex items-start gap-3 shadow-[0_0_15px_rgba(255,0,0,0.2)]">
              <span className="text-red-500 animate-pulse">⚠️</span>
              <p className="text-red-300 text-sm font-bold tracking-wider">{error}</p>
            </div>
          )}
        </div>

        <div className="absolute bottom-0 inset-x-0 h-16 bg-black/60 backdrop-blur-md border-t border-cyan-400/60 flex justify-between items-center px-8 z-50 shadow-[0_-4px_20px_rgba(0,255,255,0.2)]">
          <span className="font-mono text-[10px] text-cyan-300 tracking-[0.3em] drop-shadow-md">MODAL_STATUS // STANDBY</span>
          <div className="flex gap-4 justify-end items-center h-full py-2">
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="h-full px-8 bg-transparent text-cyan-400 font-bold tracking-widest border border-cyan-700 hover:bg-cyan-950/50 hover:border-cyan-400 hover:text-cyan-200 transition-all disabled:opacity-50 flex items-center justify-center"
              style={{ clipPath: 'polygon(10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px), 0 10px)' }}
            >
              CANCEL
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="h-full px-8 bg-cyan-600/80 text-white font-bold tracking-widest border border-cyan-300 hover:bg-cyan-500 hover:shadow-[0_0_20px_rgba(0,255,255,0.5)] transition-all disabled:opacity-50 relative overflow-hidden group flex items-center justify-center"
              style={{ clipPath: 'polygon(10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px), 0 10px)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <span className="relative z-10 whitespace-nowrap">{isLoading ? 'UPLOADING...' : 'SAVE DATA'}</span>
            </button>
          </div>
        </div>

      </div>
    </Modal>
  )
}
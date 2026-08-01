import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { useAuthStore } from '../stores/authStore'
import { ProfileHeader } from '../components/profile/ProfileHeader'
import { ProfileEditModal } from '../components/profile/ProfileEditModal'
import { StatsTab } from '../components/profile/StatsTab'
import { HistoryTab } from '../components/profile/HistoryTab'
import type { UserProfile } from '../types/user'
import { GalacticGuideTab } from '../components/profile/GalacticGuideTab'

type TabType = 'stats' | 'history' | 'guide'

export const ProfilePage = () => {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const {
    currentUser,
    fetchCurrentUser,
    setCurrentUser,
    error: authError,
  } = useAuthStore()
  const currentUserId = currentUser?.id
  const {
    profile: fetchedProfile,
    loading,
    error,
  } = useProfile(userId, currentUserId)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('stats')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const profileBackPath =
    typeof location.state === 'object' &&
    location.state !== null &&
    'from' in location.state &&
    typeof location.state.from === 'string'
      ? location.state.from
      : '/home'

  // 現在のユーザー情報を取得
  useEffect(() => {
    if (!currentUser) {
      fetchCurrentUser()
    }
  }, [currentUser, fetchCurrentUser])

  // プロフィール情報にisCurrentUserフラグを追加
  useEffect(() => {
    if (fetchedProfile && currentUserId) {
      // 取得したプロフィールに現在のユーザー情報を追加
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfile({
        ...fetchedProfile,
        isCurrentUser: fetchedProfile.id === currentUserId,
      })
    } else if (fetchedProfile) {
      setProfile({
        ...fetchedProfile,
        isCurrentUser: false,
      })
    }
  }, [fetchedProfile, currentUserId])

  const handleProfileUpdate = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile)
    if (currentUser && updatedProfile.id === currentUser.id) {
      setCurrentUser({
        ...currentUser,
        username: updatedProfile.username,
        avatarUrl: updatedProfile.avatarUrl,
        email: updatedProfile.email ?? currentUser.email,
        updatedAt: updatedProfile.updatedAt,
      })
    }
  }

  if (loading || (!currentUser && !authError)) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/60 text-lg">プロフィールを読み込み中...</div>
      </div>
    )
  }

  const pageError = error ?? authError

  if (pageError) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-red-500 text-lg">エラー: {pageError}</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/60 text-lg">
          プロフィールが見つかりません
        </div>
      </div>
    )
  }

  return (
    // 変更点: 背景を bg-black から bg-transparent に変更
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl">
        {/* プロフィールヘッダー */}
        <ProfileHeader
          profile={profile}
          onEdit={() => setIsEditModalOpen(true)}
          onBack={() => navigate(profileBackPath, { replace: true })}
        />

        {/* タブナビゲーション */}
        {/* 変更点: 背景を半透明に、ボーダーをシアンに */}
        <div className="bg-black/40 backdrop-blur-md border-x border-cyan-500/30 px-8 py-4">
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-6 py-2 rounded-full font-semibold transition-all duration-300
                ${
                  activeTab === 'stats' && <StatsTab userId={profile.id} />
                    ? 'bg-cyan-500/20 text-cyan-100 border border-cyan-400 shadow-[0_0_10px_rgba(0,255,255,0.3)]'
                    : 'bg-transparent text-cyan-300/60 border border-cyan-900/50 hover:bg-cyan-900/30 hover:text-cyan-200'
                }
              `}
            >
              統計データ
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-2 rounded-full font-semibold transition-all duration-300
                ${
                  activeTab === 'history' && <HistoryTab userId={profile.id} />
                    ? 'bg-cyan-500/20 text-cyan-100 border border-cyan-400 shadow-[0_0_10px_rgba(0,255,255,0.3)]'
                    : 'bg-transparent text-cyan-300/60 border border-cyan-900/50 hover:bg-cyan-900/30 hover:text-cyan-200'
                }
              `}
            >
              戦闘履歴
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-6 py-2 rounded-full font-semibold transition-all duration-300
                ${
                  activeTab === 'guide' && (
                    <GalacticGuideTab userId={profile.id} />
                  )
                    ? 'bg-cyan-500/20 text-cyan-100 border border-cyan-400 shadow-[0_0_10px_rgba(0,255,255,0.3)]'
                    : 'bg-transparent text-cyan-300/60 border border-cyan-900/50 hover:bg-cyan-900/30 hover:text-cyan-200'
                }
              `}
            >
              銀河ガイド
            </button>
          </div>
        </div>

        {/* タブコンテンツ */}
        {/* 変更点: 下部パネルの角丸とボーダーを調整 */}
        <div className="bg-black/50 backdrop-blur-md rounded-b-2xl border border-t-0 border-cyan-500/30 overflow-hidden min-h-[300px]">
          {activeTab === 'stats' ? (
            <StatsTab userId={profile.id} />
          ) : (
            <HistoryTab userId={profile.id} />
          )}
        </div>

        {/* プロフィール編集モーダル */}
        {profile.isCurrentUser && (
          <ProfileEditModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            profile={profile}
            onSuccess={handleProfileUpdate}
          />
        )}
      </div>
    </div>
  )
}

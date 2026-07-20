import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { useAuthStore } from '../stores/authStore'
import { ProfileHeader } from '../components/profile/ProfileHeader'
import { ProfileEditModal } from '../components/profile/ProfileEditModal'
import { StatsTab } from '../components/profile/StatsTab'
import { HistoryTab } from '../components/profile/HistoryTab'
import type { UserProfile } from '../types/user'

type TabType = 'stats' | 'history'

export const ProfilePage = () => {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser, fetchCurrentUser } = useAuthStore()
  const { profile: fetchedProfile, loading, error } = useProfile(userId)
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
    if (fetchedProfile && currentUser) {
      // 取得したプロフィールに現在のユーザー情報を追加
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfile({
        ...fetchedProfile,
        isCurrentUser: fetchedProfile.id === currentUser.id,
      })
    } else if (fetchedProfile) {
      setProfile({
        ...fetchedProfile,
        isCurrentUser: false,
      })
    }
  }, [fetchedProfile, currentUser])

  const handleProfileUpdate = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/60 text-lg">プロフィールを読み込み中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-red-500 text-lg">エラー: {error}</div>
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
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl">
        {/* プロフィールヘッダー */}
        <ProfileHeader
          profile={profile}
          onEdit={() => setIsEditModalOpen(true)}
          onBack={() => navigate(profileBackPath)}
        />

        {/* タブナビゲーション */}
        <div className="bg-black/80 border-x-2 border-white/30 px-8 py-4">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-6 py-2 rounded-full font-semibold transition-all
                ${
                  activeTab === 'stats'
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-white border-2 border-white/40 hover:bg-white/20'
                }
              `}
            >
              統計
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-2 rounded-full font-semibold transition-all
                ${
                  activeTab === 'history'
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-white border-2 border-white/40 hover:bg-white/20'
                }
              `}
            >
              履歴
            </button>
          </div>
        </div>

        {/* タブコンテンツ */}
        <div className="bg-black/80 rounded-b-3xl border-2 border-t-0 border-white/30">
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

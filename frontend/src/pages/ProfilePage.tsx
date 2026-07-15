import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
  const { currentUser, fetchCurrentUser } = useAuthStore()
  const { profile: fetchedProfile, loading, error } = useProfile(userId)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('stats')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

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
    // 変更点: 背景を bg-black から bg-transparent に変更
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl">
        {/* プロフィールヘッダー */}
        <ProfileHeader
          profile={profile}
          onEdit={() => setIsEditModalOpen(true)}
          onBack={() => navigate('/home')}
        />

        {/* タブナビゲーション */}
        {/* 変更点: 背景を半透明に、ボーダーをシアンに */}
        <div className="bg-black/40 backdrop-blur-md border-x border-cyan-500/30 px-8 py-4">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-6 py-2 rounded-full font-semibold transition-all duration-300
                ${
                  activeTab === 'stats'
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
                  activeTab === 'history'
                    ? 'bg-cyan-500/20 text-cyan-100 border border-cyan-400 shadow-[0_0_10px_rgba(0,255,255,0.3)]'
                    : 'bg-transparent text-cyan-300/60 border border-cyan-900/50 hover:bg-cyan-900/30 hover:text-cyan-200'
                }
              `}
            >
              戦闘履歴
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
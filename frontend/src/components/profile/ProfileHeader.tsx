import type { UserProfile } from '../../types/user'

interface ProfileHeaderProps {
  profile: UserProfile
  onEdit?: () => void
  onBack?: () => void
}

export const ProfileHeader = ({
  profile,
  onEdit,
  onBack,
}: ProfileHeaderProps) => {
  // TODO: Friend機能が実装されたら、friendStoreを使用してフレンド追加/解除機能を実装

  return (
    <div className="bg-black/80 rounded-t-3xl border-2 border-white/30 px-8 py-6">
      <div className="flex items-start gap-6">
        {/* アバター */}
        <div className="relative">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.displayName || profile.username}
              className="w-24 h-24 rounded-full border-2 border-white/40 object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center border-2 border-white/40">
              <span className="text-4xl">
                {profile.username.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* ユーザー情報 */}
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white mb-2">
            {profile.displayName || profile.username}
          </h1>
          <p className="text-white/60 text-sm mb-1">@{profile.username}</p>
          <p className="text-white/40 text-sm">{profile.email}</p>
        </div>

        {/* アクションボタン */}
        <div className="flex gap-3">
          {/* 戻るボタン */}
          {onBack && (
            <button
              onClick={onBack}
              className="px-6 py-2 bg-black/50 text-white rounded-full border-2 border-white/20
                       hover:border-white/40 transition-all"
            >
              戻る
            </button>
          )}

          {profile.isCurrentUser && (
            // 自分のプロフィール: 編集ボタン
            <button
              onClick={onEdit}
              className="px-6 py-2 bg-white text-black rounded-full font-semibold
                       hover:bg-white/90 transition-all"
            >
              プロフィール編集
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

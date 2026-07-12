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
    <div className="console-panel console-panel--subtle px-6 py-6">
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
          <h1 className="console-title mb-2 text-3xl">
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
              className="console-button console-button--muted px-5 py-2 text-xs"
            >
              戻る
            </button>
          )}

          {profile.isCurrentUser && (
            // 自分のプロフィール: 編集ボタン
            <button
              onClick={onEdit}
              className="console-button px-5 py-2 text-xs"
            >
              プロフィール編集
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

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
    // 変更点: 半透明のパネル＋上部の角を斜めカット（Homeのボタンと同じ雰囲気）
    <div className="bg-black/50 backdrop-blur-md rounded-t-2xl border border-cyan-500/30 px-8 py-8 relative overflow-hidden">
      {/* 背景の装飾的な光 */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row items-start gap-8 relative z-10">
        {/* アバター */}
        <div className="relative group shrink-0">
          {/* アバターの後光エフェクト */}
          <div className="absolute inset-0 bg-cyan-500 rounded-full blur-md opacity-30 group-hover:opacity-60 transition-opacity duration-300" />

          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.displayName || profile.username}
              className="relative w-28 h-28 rounded-full border-2 border-cyan-400 object-cover shadow-[0_0_15px_rgba(0,255,255,0.2)]"
            />
          ) : (
            <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-cyan-900 to-blue-900 flex items-center justify-center border-2 border-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.2)]">
              <span className="text-5xl font-bold text-cyan-100 drop-shadow-[0_0_8px_rgba(0,255,255,0.8)]">
                {profile.username.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* ユーザー情報 */}
        <div className="min-w-0 flex-1 pt-2">
          <h1 className="break-words text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-cyan-200 mb-2 tracking-wide">
            {profile.displayName || profile.username}
          </h1>
          <p className="break-words text-cyan-400/80 font-medium mb-1 tracking-wider">
            @{profile.username}
          </p>
          {profile.email && (
            <p className="break-words text-cyan-100/40 text-sm">
              {profile.email}
            </p>
          )}
        </div>

        {/* アクションボタン */}

        {/* アクションボタン */}
        <div className="flex flex-wrap gap-4 pt-4">
          {/* 戻るボタン */}
          {onBack && (
            <button
              onClick={onBack}
              className="px-6 py-2 bg-black/40 text-cyan-100 rounded-full border border-cyan-500/50 hover:bg-cyan-900/50 hover:border-cyan-300 hover:shadow-[0_0_15px_rgba(0,255,255,0.3)] transition-all duration-300"
            >
              戻る
            </button>
          )}

          {profile.isCurrentUser && (
            // 自分のプロフィール: 編集ボタン
            <button
              onClick={onEdit}
              className="px-6 py-2 bg-cyan-600/80 text-white rounded-full font-bold border border-cyan-400 hover:bg-cyan-500 hover:shadow-[0_0_20px_rgba(0,255,255,0.5)] transition-all duration-300"
            >
              データ更新
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'

interface AvatarProps {
  avatarUrl?: string | null
  username: string
  /** img とフォールバック円の両方に付く（サイズ・角丸・枠・影など） */
  className?: string
  /** フォールバック円にだけ付く（背景・文字色・文字サイズなど） */
  fallbackClassName?: string
}

/**
 * Avatar component
 * ユーザーが設定したアバター画像を表示し、
 * 未設定または読み込み失敗時はユーザー名の頭文字（大文字）を表示する
 */
export function Avatar({
  avatarUrl,
  username,
  className = '',
  fallbackClassName = '',
}: AvatarProps) {
  const [failed, setFailed] = useState(false)
  const [lastAvatarUrl, setLastAvatarUrl] = useState(avatarUrl)

  // avatarUrl が差し替わったらエラー状態をリセットする（レンダー中に検知する React 推奨パターン）
  if (avatarUrl !== lastAvatarUrl) {
    setLastAvatarUrl(avatarUrl)
    setFailed(false)
  }

  if (avatarUrl && !failed) {
    return (
      <img
        src={avatarUrl}
        alt={username}
        onError={() => setFailed(true)}
        className={`object-cover ${className}`}
      />
    )
  }

  return (
    <div
      className={`flex items-center justify-center ${className} ${fallbackClassName}`}
    >
      {username.charAt(0).toUpperCase()}
    </div>
  )
}

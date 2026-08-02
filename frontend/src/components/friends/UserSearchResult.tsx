import type { SearchResult } from '../../types/friend'
import { Avatar } from '../common/Avatar'

interface UserSearchResultProps {
  user: SearchResult
  onSendRequest: (userId: string) => void
}

/**
 * UserSearchResult component
 * Displays a search result with friend request button
 */
export function UserSearchResult({
  user,
  onSendRequest,
}: UserSearchResultProps) {
  // ボタンの状態とテキストを決定
  const getButtonState = () => {
    if (user.isFriend) {
      return {
        disabled: true,
        text: 'フレンド',
        className:
          'bg-gray-500/20 border-2 border-gray-500 text-gray-500 cursor-not-allowed',
      }
    }
    if (user.isPending) {
      return {
        disabled: true,
        text: '申請中',
        className:
          'bg-yellow-500/20 border-2 border-yellow-500 text-yellow-500 cursor-not-allowed',
      }
    }
    return {
      disabled: false,
      text: 'フレンド申請',
      className:
        'bg-blue-500/20 border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white',
    }
  }

  const buttonState = getButtonState()

  return (
    <div className="bg-black/50 border-2 border-white/20 rounded-2xl p-4 hover:border-white/40 transition-all">
      <div className="flex items-center justify-between">
        {/* ユーザー情報 */}
        <div className="flex items-center gap-4">
          {/* アバター */}
          <Avatar
            avatarUrl={user.avatarUrl}
            username={user.username}
            className="h-12 w-12 rounded-full border border-cyan-400 shadow-[0_0_10px_rgba(0,255,255,0.3)]"
            fallbackClassName="bg-cyan-950 text-cyan-300 font-bold text-xl"
          />

          {/* ユーザー名 */}
          <div>
            <p className="text-white font-semibold text-lg">{user.username}</p>
          </div>
        </div>

        {/* フレンド申請ボタン */}
        <button
          onClick={() => !buttonState.disabled && onSendRequest(user.id)}
          disabled={buttonState.disabled}
          className={`${buttonState.className} px-6 py-2 rounded-full transition-all font-semibold`}
        >
          {buttonState.text}
        </button>
      </div>
    </div>
  )
}

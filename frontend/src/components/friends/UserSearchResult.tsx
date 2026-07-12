import type { SearchResult } from '../../types/friend'

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
      className: 'console-button',
    }
  }

  const buttonState = getButtonState()

  return (
    <div className="console-panel console-panel--subtle p-4 transition-all hover:border-[#b8ff64]">
      <div className="flex items-center justify-between">
        {/* ユーザー情報 */}
        <div className="flex items-center gap-4">
          {/* アバター */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-xl">
            {user.username[0].toUpperCase()}
          </div>

          {/* ユーザー名 */}
          <div>
            <p className="text-white font-semibold text-lg">{user.username}</p>
          </div>
        </div>

        {/* フレンド申請ボタン */}
        <button
          onClick={() => !buttonState.disabled && onSendRequest(user.id)}
          disabled={buttonState.disabled}
          className={`${buttonState.className} px-5 py-2 text-xs`}
        >
          {buttonState.text}
        </button>
      </div>
    </div>
  )
}

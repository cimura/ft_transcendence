import { useNavigate } from 'react-router-dom'
import { ConsolePage } from '../../components/common/ConsolePage'

/**
 * FriendsMenuPage component
 * Menu page for friend-related features
 */
export function FriendsMenuPage() {
  const navigate = useNavigate()

  return (
    <ConsolePage title="FRIENDS" kicker="SOCIAL NETWORK">
      <div className="grid gap-4">
        {/* フレンド一覧ボタン */}
        <button
          onClick={() => navigate('/friends/list')}
          className="w-full bg-black text-white text-2xl font-bold py-6 rounded-full border-2 border-white/40 hover:border-white/60 hover:bg-white/5 transition-all"
        >
          フレンド一覧
        </button>

        {/* フレンドリクエストボタン */}
        <button
          onClick={() => navigate('/friends/requests')}
          className="w-full bg-black text-white text-2xl font-bold py-6 rounded-full border-2 border-white/40 hover:border-white/60 hover:bg-white/5 transition-all"
        >
          フレンドリクエスト
        </button>

        {/* ユーザー検索ボタン */}
        <button
          onClick={() => navigate('/friends/search')}
          className="w-full bg-black text-white text-2xl font-bold py-6 rounded-full border-2 border-white/40 hover:border-white/60 hover:bg-white/5 transition-all"
        >
          ユーザー検索
        </button>
      </div>
    </ConsolePage>
  )
}

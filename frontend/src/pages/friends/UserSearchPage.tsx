import { useNavigate } from 'react-router-dom'
import { useUserSearch } from '../../hooks/friends/useUserSearch'
import { UserSearchBar } from '../../components/friends/UserSearchBar'
import { UserSearchResult } from '../../components/friends/UserSearchResult'

/**
 * UserSearchPage component
 * Search for users and send friend requests
 */
export function UserSearchPage() {
  const navigate = useNavigate()
  const { query, setQuery, results, loading, error, sendRequest } =
    useUserSearch()

  // フレンド申請送信
  const handleSendRequest = async (userId: string) => {
    try {
      await sendRequest(userId)
    } catch (err) {
      console.error('Failed to send friend request:', err)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* メインコンテナ */}
      <div className="relative w-full max-w-4xl">
        {/* 戻るボタン */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 bg-black/50 text-white px-6 py-3 rounded-full border-2 border-white/20 hover:border-white/40 transition-all"
        >
          戻る
        </button>

        {/* タイトル */}
        <div className="bg-black/80 rounded-t-3xl border-2 border-white/30 px-8 py-6 text-center">
          <h1 className="text-4xl font-bold text-white">ユーザー検索</h1>
        </div>

        {/* コンテンツエリア */}
        <div className="bg-black/80 border-x-2 border-b-2 border-white/30 rounded-b-3xl px-8 py-6 min-h-[400px]">
          {/* 検索バー */}
          <div className="mb-6">
            <UserSearchBar value={query} onChange={setQuery} />
          </div>

          {/* ローディング表示 */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-white text-xl">検索中...</div>
            </div>
          )}

          {/* エラー表示 */}
          {error && (
            <div className="flex items-center justify-center py-12">
              <div className="text-red-500 text-xl">{error}</div>
            </div>
          )}

          {/* 検索結果 */}
          {!loading && !error && (
            <>
              {query.trim() === '' ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-white/50 text-xl">
                    ユーザー名を入力して検索してください
                  </div>
                </div>
              ) : results.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-white/50 text-xl">
                    ユーザーが見つかりませんでした
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {results.map((user) => (
                    <UserSearchResult
                      key={user.id}
                      user={user}
                      onSendRequest={handleSendRequest}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

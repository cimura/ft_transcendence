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
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4 relative">
      {/* メインコンテナ */}
      <div className="relative w-full max-w-4xl z-10 mt-12">
        {/* 戻るボタン */}
        <button
          onClick={() => navigate(-1)}
          className="absolute -top-16 left-0 bg-black/40 backdrop-blur-md text-cyan-100 px-6 py-2 rounded-full border border-cyan-500/50 hover:bg-cyan-900/50 hover:border-cyan-300 hover:shadow-[0_0_15px_rgba(0,255,255,0.3)] transition-all"
        >
          &lt; 戻る
        </button>

        {/* タイトル */}
        <div className="bg-black/50 backdrop-blur-md rounded-t-3xl border border-cyan-500/30 px-8 py-6 text-center relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-70" />
          <h1 className="text-4xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 drop-shadow-[0_0_10px_rgba(0,255,255,0.3)]">
            ユーザー検索
          </h1>
        </div>

        {/* コンテンツエリア */}
        <div className="bg-black/50 backdrop-blur-md border-x border-b border-cyan-500/30 rounded-b-3xl px-8 py-6 min-h-[400px]">
          {/* 検索バー */}
          <div className="mb-6">
            <UserSearchBar value={query} onChange={setQuery} />
          </div>

          {/* ローディング表示 */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-cyan-100/60 text-xl animate-pulse">
                検索中...
              </div>
            </div>
          )}

          {/* エラー表示 */}
          {error && (
            <div className="flex items-center justify-center py-12">
              <div className="text-red-400 text-xl">{error}</div>
            </div>
          )}

          {/* 検索結果 */}
          {!loading && !error && (
            <>
              {query.trim() === '' ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-cyan-100/50 text-xl tracking-widest">
                    ユーザー名を入力して検索してください
                  </div>
                </div>
              ) : results.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-cyan-100/50 text-xl tracking-widest">
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

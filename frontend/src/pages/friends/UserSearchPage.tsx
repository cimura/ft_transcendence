import { useUserSearch } from '../../hooks/friends/useUserSearch'
import { UserSearchBar } from '../../components/friends/UserSearchBar'
import { UserSearchResult } from '../../components/friends/UserSearchResult'
import { ConsolePage } from '../../components/common/ConsolePage'

/**
 * UserSearchPage component
 * Search for users and send friend requests
 */
export function UserSearchPage() {
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
    <ConsolePage title="USER SEARCH" kicker="SOCIAL NETWORK / DIRECTORY">
      <div className="min-h-[400px]">
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
    </ConsolePage>
  )
}

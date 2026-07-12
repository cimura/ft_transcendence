import { FriendRequestCard } from '../../components/friends/FriendRequestCard'
import { useFriendRequests } from '../../hooks/friends/useFriendRequests'
import { ConsolePage } from '../../components/common/ConsolePage'

/**
 * FriendRequestsPage component
 * Displays received friend requests with accept/reject actions
 */
export function FriendRequestsPage() {
  const { requests, loading, error, acceptRequest, rejectRequest } =
    useFriendRequests()

  // 承認処理
  const handleAccept = async (requestId: string) => {
    await acceptRequest(requestId)
  }

  // 拒否処理
  const handleReject = async (requestId: string) => {
    await rejectRequest(requestId)
  }

  return (
    <ConsolePage title="FRIEND REQUESTS" kicker="SOCIAL NETWORK / INBOX">
      <div className="min-h-[400px]">
        {/* リクエストリスト */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-white text-xl">読み込み中...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-red-500 text-xl">{error}</div>
          </div>
        ) : requests.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-white/50 text-xl">
              フレンドリクエストはありません
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <FriendRequestCard
                key={request.id}
                request={request}
                onAccept={handleAccept}
                onReject={handleReject}
              />
            ))}
          </div>
        )}
      </div>
    </ConsolePage>
  )
}

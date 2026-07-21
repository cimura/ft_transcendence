import { useNavigate } from 'react-router-dom'
import { FriendRequestCard } from '../../components/friends/FriendRequestCard'
import { useFriendRequests } from '../../hooks/friends/useFriendRequests'

/**
 * FriendRequestsPage component
 * Displays received friend requests with accept/reject actions
 */
export function FriendRequestsPage() {
  const navigate = useNavigate()
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
            フレンドリクエスト
          </h1>
        </div>

        {/* コンテンツエリア */}
        <div className="bg-black/50 backdrop-blur-md border-x border-b border-cyan-500/30 rounded-b-3xl px-8 py-6 min-h-[400px]">
          {/* リクエストリスト */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-cyan-100/60 text-xl animate-pulse">
                読み込み中...
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-red-400 text-xl">{error}</div>
            </div>
          ) : requests.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-cyan-100/50 text-xl tracking-widest">
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
      </div>
    </div>
  )
}

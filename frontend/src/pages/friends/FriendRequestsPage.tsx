import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { FriendRequest } from '../../types/friend'
import { FriendRequestCard } from '../../components/friends/FriendRequestCard'

// モックデータ（バックエンド実装後にuseFriendRequestsフックに切り替える）
const MOCK_REQUESTS: FriendRequest[] = [
  {
    id: 'req-1',
    requester: {
      id: 'user-10',
      username: 'new_user1',
      email: 'new_user1@example.com',
      avatarUrl: undefined,
    },
    receiver: {
      id: 'user-1',
      username: 'me',
      email: 'me@example.com',
      avatarUrl: undefined,
    },
    status: 'pending',
    createdAt: new Date('2024-01-20'),
  },
  {
    id: 'req-2',
    requester: {
      id: 'user-11',
      username: 'new_user2',
      email: 'new_user2@example.com',
      avatarUrl: undefined,
    },
    receiver: {
      id: 'user-1',
      username: 'me',
      email: 'me@example.com',
      avatarUrl: undefined,
    },
    status: 'pending',
    createdAt: new Date('2024-01-21'),
  },
]

/**
 * FriendRequestsPage component
 * Displays received friend requests with accept/reject actions
 */
export function FriendRequestsPage() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState<FriendRequest[]>(MOCK_REQUESTS)

  // 承認処理
  const handleAccept = (requestId: string) => {
    // TODO: バックエンド実装後にacceptRequest(requestId)を呼ぶ
    console.log('承認:', requestId)
    setRequests((prev) => prev.filter((req) => req.id !== requestId))
  }

  // 拒否処理
  const handleReject = (requestId: string) => {
    // TODO: バックエンド実装後にrejectRequest(requestId)を呼ぶ
    console.log('拒否:', requestId)
    setRequests((prev) => prev.filter((req) => req.id !== requestId))
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
          <h1 className="text-4xl font-bold text-white">フレンドリクエスト</h1>
        </div>

        {/* コンテンツエリア */}
        <div className="bg-black/80 border-x-2 border-b-2 border-white/30 rounded-b-3xl px-8 py-6 min-h-[400px]">
          {/* リクエストリスト */}
          {requests.length === 0 ? (
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
      </div>
    </div>
  )
}

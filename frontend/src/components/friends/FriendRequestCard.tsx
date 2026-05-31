import type { FriendRequest } from '../../types/friend'

interface FriendRequestCardProps {
  request: FriendRequest
  onAccept: (requestId: string) => void
  onReject: (requestId: string) => void
}

/**
 * FriendRequestCard component
 * Displays a friend request with accept/reject buttons
 */
export function FriendRequestCard({
  request,
  onAccept,
  onReject,
}: FriendRequestCardProps) {
  return (
    <div className="bg-black/50 border-2 border-white/20 rounded-2xl p-4 hover:border-white/40 transition-all">
      <div className="flex items-center justify-between">
        {/* ユーザー情報 */}
        <div className="flex items-center gap-4">
          {/* アバター */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl">
            {request.requester.username[0].toUpperCase()}
          </div>

          {/* ユーザー名 */}
          <div>
            <p className="text-white font-semibold text-lg">
              {request.requester.username}
            </p>
            <p className="text-white/50 text-sm">{request.requester.email}</p>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex items-center gap-2">
          {/* 承認ボタン */}
          <button
            onClick={() => onAccept(request.id)}
            className="bg-green-500/20 border-2 border-green-500 text-green-500 px-6 py-2 rounded-full hover:bg-green-500 hover:text-white transition-all font-semibold"
          >
            承認
          </button>

          {/* 拒否ボタン */}
          <button
            onClick={() => onReject(request.id)}
            className="bg-red-500/20 border-2 border-red-500 text-red-500 px-6 py-2 rounded-full hover:bg-red-500 hover:text-white transition-all font-semibold"
          >
            拒否
          </button>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { acceptFriendRequest, rejectFriendRequest } from '../api/friend'
import { acceptRoomInvitation, declineRoomInvitation } from '../api/rooms'
import { getApiErrorMessage } from '../api/errors'
import { useNotifications } from '../hooks/useNotifications'
import { useLobbyStore } from '../stores/lobbyStore'
import type { NotificationItem } from '../types/notification'

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('ja-JP', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))

export function NotificationsPage() {
  const navigate = useNavigate()
  const { notifications, loading, error, refetch } = useNotifications()
  const { setCurrentRoom, upsertRoom } = useLobbyStore()
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const runAction = async (
    notificationId: string,
    action: () => Promise<void>
  ) => {
    try {
      setProcessingId(notificationId)
      setActionError(null)
      await action()
      await refetch()
    } catch (err) {
      setActionError(getApiErrorMessage(err, '操作に失敗しました'))
    } finally {
      setProcessingId(null)
    }
  }

  const handleAcceptFriend = (item: NotificationItem) => {
    if (item.type !== 'friend_request') return
    runAction(item.id, () => acceptFriendRequest(item.friendRequestId))
  }

  const handleRejectFriend = (item: NotificationItem) => {
    if (item.type !== 'friend_request') return
    runAction(item.id, () => rejectFriendRequest(item.friendRequestId))
  }

  const handleAcceptInvite = (item: NotificationItem) => {
    if (item.type !== 'game_invite') return
    runAction(item.id, async () => {
      const room = await acceptRoomInvitation(item.invitationId)
      upsertRoom(room)
      setCurrentRoom(room)
      navigate(`/room/${room.id}`)
    })
  }

  const handleDeclineInvite = (item: NotificationItem) => {
    if (item.type !== 'game_invite') return
    runAction(item.id, () => declineRoomInvitation(item.invitationId))
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl">
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 bg-black/50 text-white px-6 py-3 rounded-full border-2 border-white/20 hover:border-white/40 transition-all"
        >
          戻る
        </button>

        <div className="bg-black/80 rounded-t-3xl border-2 border-white/30 px-8 py-6 text-center">
          <h1 className="text-4xl font-bold text-white">通知</h1>
        </div>

        <div className="bg-black/80 border-x-2 border-b-2 border-white/30 rounded-b-3xl px-8 py-6 min-h-[400px]">
          {actionError && (
            <div className="mb-4 rounded-lg border border-red-500/40 bg-red-950/50 px-4 py-3 text-red-200">
              {actionError}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-white text-xl">読み込み中...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-red-500 text-xl">{error}</div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-white/50 text-xl">通知はありません</div>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((item) => {
                const disabled = processingId === item.id
                const title =
                  item.type === 'friend_request'
                    ? `${item.actor.username} からフレンド申請が届いています`
                    : `${item.actor.username} からゲーム招待が届いています`
                const detail =
                  item.type === 'friend_request'
                    ? '承認するとフレンドに追加されます'
                    : `ルーム: ${item.room.name}`

                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 rounded-2xl border-2 border-white/30 bg-black px-6 py-5 text-white sm:flex-row sm:items-center"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {item.actor.avatarUrl ? (
                        <img
                          src={item.actor.avatarUrl}
                          alt={item.actor.username}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-xl font-bold">
                          {item.actor.username.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-lg font-semibold">{title}</p>
                        <p className="text-sm text-white/60">{detail}</p>
                        <p className="mt-1 text-xs text-white/40">
                          {formatDate(item.createdAt)}
                        </p>
                      </div>
                    </div>

                    {item.type === 'friend_request' ? (
                      <div className="flex gap-3 sm:flex-shrink-0">
                        <button
                          onClick={() => handleAcceptFriend(item)}
                          disabled={disabled}
                          className="rounded-full bg-green-600 px-5 py-2 font-semibold text-white transition hover:bg-green-500 disabled:opacity-50"
                        >
                          承認
                        </button>
                        <button
                          onClick={() => handleRejectFriend(item)}
                          disabled={disabled}
                          className="rounded-full bg-white/10 px-5 py-2 font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
                        >
                          拒否
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-3 sm:flex-shrink-0">
                        <button
                          onClick={() => handleAcceptInvite(item)}
                          disabled={disabled}
                          className="rounded-full bg-blue-600 px-5 py-2 font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
                        >
                          参加
                        </button>
                        <button
                          onClick={() => handleDeclineInvite(item)}
                          disabled={disabled}
                          className="rounded-full bg-white/10 px-5 py-2 font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
                        >
                          辞退
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

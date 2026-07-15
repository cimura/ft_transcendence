import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { acceptFriendRequest, rejectFriendRequest } from '../api/friend'
import { acceptRoomInvitation, declineRoomInvitation } from '../api/rooms'
import { getApiErrorMessage } from '../api/errors'
import { useNotifications } from '../hooks/useNotifications'
import { useRoomStore } from '../stores/roomStore'
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
  const { notifications, loading, error, refetch, removeNotification } =
    useNotifications()
  const { setCurrentRoom, upsertRoom } = useRoomStore()
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const runAction = async (
    notificationId: string,
    action: () => Promise<void>,
    options: { skipRefetch?: boolean; skipReset?: boolean } = {}
  ) => {
    let completed = false
    try {
      setProcessingId(notificationId)
      setActionError(null)
      await action()
      completed = true
      if (!options.skipRefetch) {
        await refetch()
      } else {
        removeNotification(notificationId)
      }
    } catch (err) {
      setActionError(getApiErrorMessage(err, '操作に失敗しました'))
    } finally {
      if (!options.skipReset || !completed) {
        setProcessingId(null)
      }
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
    if (item.type !== 'room_invitation') return
    runAction(
      item.id,
      async () => {
        const room = await acceptRoomInvitation(item.invitationId)
        upsertRoom(room)
        setCurrentRoom(room)
        navigate(`/room/${room.id}`)
      },
      { skipRefetch: true, skipReset: true }
    )
  }

  const handleDeclineInvite = (item: NotificationItem) => {
    if (item.type !== 'room_invitation') return
    runAction(item.id, () => declineRoomInvitation(item.invitationId))
  }

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4 relative">
      <div className="relative w-full max-w-4xl z-10 mt-12">
        
        <button
          onClick={() => navigate(-1)}
          className="absolute -top-16 left-0 bg-black/40 backdrop-blur-md text-cyan-100 px-6 py-2 rounded-full border border-cyan-500/50 hover:bg-cyan-900/50 hover:border-cyan-300 hover:shadow-[0_0_15px_rgba(0,255,255,0.3)] transition-all"
        >
          &lt; 戻る
        </button>

        <div className="bg-black/50 backdrop-blur-md rounded-t-3xl border border-cyan-500/30 px-8 py-6 text-center relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-70" />
          <h1 className="text-4xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 drop-shadow-[0_0_10px_rgba(0,255,255,0.3)]">
            通知
          </h1>
        </div>

        <div className="bg-black/50 backdrop-blur-md border-x border-b border-cyan-500/30 rounded-b-3xl px-8 py-6 min-h-[400px]">
          {actionError && (
            <div className="mb-4 rounded-lg border border-red-500/40 bg-red-900/50 backdrop-blur-sm px-4 py-3 text-red-200 shadow-[0_0_15px_rgba(255,0,0,0.2)]">
              {actionError}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-cyan-100/60 text-xl animate-pulse">受信中...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-red-400 text-xl">{error}</div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-cyan-100/40 text-xl tracking-widest">NO NEW MESSAGES</div>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((item) => {
                const disabled = processingId === item.id
                const title =
                  item.type === 'friend_request'
                    ? `${item.actor.username} からフレンド申請が届いています`
                    : `${item.actor.username} からルーム招待が届いています`
                const detail =
                  item.type === 'friend_request'
                    ? '承認するとフレンドに追加されます'
                    : `ルーム: ${item.room.name}`

                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 rounded-xl border border-cyan-500/40 bg-black/60 backdrop-blur-md px-6 py-5 text-cyan-100 transition-all hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(0,255,255,0.2)] sm:flex-row sm:items-center"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {item.actor.avatarUrl ? (
                        <img
                          src={item.actor.avatarUrl}
                          alt={item.actor.username}
                          className="h-12 w-12 rounded-full object-cover border border-cyan-400 shadow-[0_0_10px_rgba(0,255,255,0.3)]"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-900/50 border border-cyan-500 text-xl font-bold shadow-[0_0_10px_rgba(0,255,255,0.3)]">
                          {item.actor.username.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-lg font-bold text-white tracking-wide">{title}</p>
                        <p className="text-sm text-cyan-200/80">{detail}</p>
                        <p className="mt-1 text-xs text-cyan-100/40 font-mono">
                          {formatDate(item.createdAt)}
                        </p>
                      </div>
                    </div>

                    {item.type === 'friend_request' ? (
                      <div className="flex gap-3 sm:flex-shrink-0">
                        <button
                          onClick={() => handleAcceptFriend(item)}
                          disabled={disabled}
                          className="rounded-full bg-cyan-600/80 border border-cyan-400 px-5 py-2 font-bold text-white transition-all hover:bg-cyan-500 hover:shadow-[0_0_15px_rgba(0,255,255,0.5)] disabled:opacity-50"
                        >
                          承認
                        </button>
                        <button
                          onClick={() => handleRejectFriend(item)}
                          disabled={disabled}
                          className="rounded-full bg-red-900/40 border border-red-500/50 px-5 py-2 font-bold text-red-200 transition-all hover:bg-red-800/60 hover:border-red-400 hover:shadow-[0_0_15px_rgba(255,0,0,0.3)] disabled:opacity-50"
                        >
                          拒否
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-3 sm:flex-shrink-0">
                        <button
                          onClick={() => handleAcceptInvite(item)}
                          disabled={disabled}
                          className="rounded-full bg-blue-600/80 border border-blue-400 px-5 py-2 font-bold text-white transition-all hover:bg-blue-500 hover:shadow-[0_0_15px_rgba(0,100,255,0.5)] disabled:opacity-50"
                        >
                          参加
                        </button>
                        <button
                          onClick={() => handleDeclineInvite(item)}
                          disabled={disabled}
                          className="rounded-full bg-red-900/40 border border-red-500/50 px-5 py-2 font-bold text-red-200 transition-all hover:bg-red-800/60 hover:border-red-400 hover:shadow-[0_0_15px_rgba(255,0,0,0.3)] disabled:opacity-50"
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
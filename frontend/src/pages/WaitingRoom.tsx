import { useNavigate, useParams } from 'react-router-dom'
import { useRoomStore } from '../stores/roomStore'
import { useEffect, useState } from 'react'
import { Button } from '../components/common/Button'
import { PlayerCard } from '../components/waitingRoom/PlayerCard'
import { ChatPanel } from '../components/waitingRoom/ChatPanel'
import { GameMapPreview } from '../components/game/preview/GameMapPreview'
import { useAuthStore } from '../stores/authStore'
import {
  createRoomInvitation,
  getRoom,
  joinRoom,
  leaveRoom,
  setRoomReady,
  startRoom,
} from '../api/rooms'
import { useRoomSocket } from '../hooks/useRoomSocket'
import axios from 'axios'
import { getApiErrorMessage } from '../api/errors'
import { useFriends } from '../hooks/friends/useFriends'
import type { GameRoom } from '../types/room'

export function WaitingRoom() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { currentRoom, setCurrentRoom, removeRoom, upsertRoom } =
    useRoomStore()
  const { currentUser, accessToken, fetchCurrentUser } = useAuthStore()
  const [isLoadingRoom, setIsLoadingRoom] = useState(true)
  const currentUserId = currentUser?.id

  useRoomSocket(roomId)

  useEffect(() => {
    if (!roomId) {
      navigate('/home', { replace: true })
      return
    }

    let cancelled = false

    const loadRoom = async () => {
      if (currentRoom?.id === roomId) {
        setIsLoadingRoom(false)
        return
      }

      try {
        const joinedRoom = await joinRoom(roomId)
        if (cancelled) return
        upsertRoom(joinedRoom)
        setCurrentRoom(joinedRoom)
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 409) {
          try {
            const room = await getRoom(roomId)
            if (cancelled) return
            upsertRoom(room)
            setCurrentRoom(room)
            if (room.status === 'playing') {
              navigate(`/game/${room.id}`, { replace: true })
            }
          } catch (refreshError) {
            console.error('Failed to refresh room:', refreshError)
            if (!cancelled) navigate('/home', { replace: true })
          }
          return
        }

        console.error('Failed to join room:', error)
        if (!cancelled) navigate('/home', { replace: true })
      } finally {
        if (!cancelled) {
          setIsLoadingRoom(false)
        }
      }
    }

    void loadRoom()

    return () => {
      cancelled = true
    }
  }, [currentRoom?.id, navigate, roomId, setCurrentRoom, upsertRoom])

  useEffect(() => {
    if (!currentUser) {
      fetchCurrentUser()
    }
  }, [currentUser, fetchCurrentUser])

  useEffect(() => {
    if (
      currentRoom &&
      currentRoom.id === roomId &&
      currentRoom.status === 'playing'
    ) {
      navigate(`/game/${currentRoom.id}`, { replace: true })
    }
  }, [currentRoom, navigate, roomId])

  if (!currentRoom || !roomId || isLoadingRoom) {
    return null
  }

  const currentPlayer = currentRoom.players.find(
    (p) => p.userId === currentUserId
  )
  const isHost = currentPlayer?.isHost || false
  const isReady = currentPlayer?.isReady || false
  const allReady = currentRoom.players.every((p) => p.isReady)
  const isLocalCpu = currentRoom.mode === 'local_cpu'
  const hasEnoughPlayers = isLocalCpu
    ? currentRoom.players.length === 1
    : currentRoom.players.length === currentRoom.maxPlayers
  const canStart = isHost && allReady && hasEnoughPlayers

  // toggle ready/unready
  const handleToggleReady = async () => {
    try {
      const room = await setRoomReady(currentRoom.id, !isReady)
      upsertRoom(room)
      setCurrentRoom(room)
    } catch (error) {
      console.error('Failed to update ready state:', error)
    }
  }

  // start game
  const handleStartGame = async () => {
    try {
      const room = await startRoom(currentRoom.id)
      upsertRoom(room)
      setCurrentRoom(room)
      navigate(`/game/${room.id}`)
    } catch (error) {
      console.error('Failed to start game:', error)
    }
  }

  // leave room
  const handleLeaveRoom = async () => {
    console.log('部屋を退出')

    try {
      const result = await leaveRoom(currentRoom.id)

      if (result.deleted) {
        removeRoom(result.roomId)
      } else {
        upsertRoom(result)
      }

      setCurrentRoom(null)
      navigate('/home')
    } catch (error) {
      const status =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof error.response === 'object' &&
        error.response !== null &&
        'status' in error.response
          ? error.response.status
          : undefined

      if (status === 403 || status === 404) {
        removeRoom(currentRoom.id)
        setCurrentRoom(null)
        navigate('/home')
        return
      }

      console.error('Failed to leave room:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {currentRoom.name}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                ホスト: {currentRoom.hostName}
              </p>
            </div>
            <Button variant="danger" size="sm" onClick={handleLeaveRoom}>
              退出
            </Button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* プレイヤー一覧 */}
        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_360px]">
          <section>
            <div className="mb-6">
              <h2 className="mb-4 text-xl font-bold text-gray-900">
                プレイヤー ({currentRoom.players.length} /{' '}
                {currentRoom.maxPlayers})
              </h2>
              <div className="space-y-3">
                {currentRoom.players.map((player) => (
                  <PlayerCard key={player.userId} player={player} />
                ))}
                {/* 空きスロット */}
                {Array.from({
                  length: currentRoom.maxPlayers - currentRoom.players.length,
                }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4"
                  >
                    <span className="text-gray-400">空きスロット</span>
                  </div>
                ))}
              </div>
            </div>

            {/* アクションボタン */}
            <div className="flex gap-4">
              {!isHost && (
                <Button
                  variant={isReady ? 'secondary' : 'primary'}
                  size="lg"
                  onClick={handleToggleReady}
                  className="flex-1"
                >
                  {isReady ? 'Unready' : 'Ready'}
                </Button>
              )}
              {isHost && (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleStartGame}
                  disabled={!canStart}
                  className="flex-1"
                >
                  {canStart ? 'ゲーム開始' : '全員の準備を待っています...'}
                </Button>
              )}
            </div>

            {/* ヒント */}
            {isHost && (!allReady || !hasEnoughPlayers) && (
              <p className="mt-4 text-center text-sm text-gray-500">
                満員になり、全員が Ready になるとゲームを開始できます
              </p>
            )}

            {isHost && currentRoom.status === 'waiting' && (
              <RoomInviteSection currentRoom={currentRoom} />
            )}
          </section>

          <section className="rounded-lg bg-white p-4 shadow">
            <h2 className="text-xl font-bold text-gray-900">ゲーム情報</h2>
            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold text-gray-500">
                ステージイメージ
              </p>
              <GameMapPreview />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-md bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-500">ゲーム</p>
                <p className="mt-1 text-lg font-bold text-gray-900">
                  ボンバーマン
                </p>
              </div>
              <div className="rounded-md bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-500">勝利条件</p>
                <p className="mt-1 text-gray-900">
                  爆弾で相手を倒し、最後まで生き残る
                </p>
              </div>
              <div className="rounded-md bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-500">操作</p>
                <p className="mt-1 text-gray-900">
                  WASD / 矢印キーで移動、Spaceで爆弾設置
                </p>
              </div>
              <div className="rounded-md bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-500">人数</p>
                <p className="mt-1 text-gray-900">
                  最大 {currentRoom.maxPlayers} 人
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              ゲーム画面は現在フロントエンド確認用の仮実装です。
              バックエンド接続後は、全員の準備完了とゲーム開始イベントに合わせて遷移します。
            </div>
          </section>

          <ChatPanel
            roomId={roomId}
            currentUser={currentUser}
            accessToken={accessToken}
          />
        </div>
      </main>
    </div>
  )
}

function RoomInviteSection({ currentRoom }: { currentRoom: GameRoom }) {
  const { friends } = useFriends()
  const [selectedInviteeId, setSelectedInviteeId] = useState('')
  const [inviteMessage, setInviteMessage] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteLoading, setInviteLoading] = useState(false)

  const handleInviteFriend = async () => {
    if (!selectedInviteeId) return

    try {
      setInviteLoading(true)
      setInviteError(null)
      setInviteMessage(null)
      await createRoomInvitation(currentRoom.id, selectedInviteeId)
      const invitedFriend = friends.find(
        (friend) => friend.id === selectedInviteeId
      )
      setInviteMessage(
        `${invitedFriend?.username ?? 'フレンド'} に招待を送りました`
      )
      setSelectedInviteeId('')
    } catch (error) {
      setInviteError(getApiErrorMessage(error, '招待の送信に失敗しました'))
    } finally {
      setInviteLoading(false)
    }
  }

  return (
    <div className="mt-6 rounded-lg bg-white p-4 shadow">
      <h3 className="text-lg font-bold text-gray-900">フレンドを招待</h3>
      <div className="mt-3 flex gap-3">
        <select
          value={selectedInviteeId}
          onChange={(event) => setSelectedInviteeId(event.target.value)}
          className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900"
        >
          <option value="">フレンドを選択</option>
          {friends
            .filter(
              (friend) =>
                !currentRoom.players.some(
                  (player) => player.userId === friend.id
                )
            )
            .map((friend) => (
              <option key={friend.id} value={friend.id}>
                {friend.username}
              </option>
            ))}
        </select>
        <Button
          variant="primary"
          size="sm"
          onClick={handleInviteFriend}
          disabled={!selectedInviteeId || inviteLoading}
        >
          招待
        </Button>
      </div>
      {inviteMessage && (
        <p className="mt-2 text-sm text-green-700">{inviteMessage}</p>
      )}
      {inviteError && (
        <p className="mt-2 text-sm text-red-700">{inviteError}</p>
      )}
    </div>
  )
}

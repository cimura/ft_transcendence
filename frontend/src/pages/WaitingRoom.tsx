import { useNavigate, useParams } from 'react-router-dom'
import { useLobbyStore } from '../stores/lobbyStore'
import { useEffect, useState } from 'react'
import { Button } from '../components/common/Button'
import { PlayerCard } from '../components/waitingRoom/PlayerCard'
import { ChatPanel } from '../components/waitingRoom/ChatPanel'
import { GameMapPreview } from '../components/game/GameMapPreview'
import { useAuthStore } from '../stores/authStore'
import { leaveRoom } from '../api/rooms'
import { useLobbySocket } from '../hooks/useLobbySocket'

export function WaitingRoom() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { currentRoom, setCurrentRoom, removeRoom, upsertRoom } =
    useLobbyStore()
  const { currentUser, accessToken, fetchCurrentUser } = useAuthStore()
  const [isReady, setIsReady] = useState(false)

  const currentUserId = currentUser?.id

  useLobbySocket()

  useEffect(() => {
    // ルーム情報がない場合はロビーへ戻る
    if (!currentRoom || currentRoom.id !== roomId) {
      navigate('/lobby')
    }
  }, [currentRoom, roomId, navigate])

  useEffect(() => {
    if (!currentUser) {
      fetchCurrentUser()
    }
  }, [currentUser, fetchCurrentUser])

  if (!currentRoom || !roomId) {
    return null
  }

  const currentPlayer = currentRoom.players.find(
    (p) => p.userId === currentUserId
  )
  const isHost = currentPlayer?.isHost || false
  const allReady = currentRoom.players.every((p) => p.isReady)
  // TODO: バックエンド接続後は2人以上など正式な開始条件に戻す
  const canStart = isHost && allReady && currentRoom.players.length >= 1

  // toggle ready/unready
  const handleToggleReady = () => {
    setIsReady(!isReady)
    console.log('Ready状態を切り替え:', isReady)
    // TODO: WebSocketでサーバーに送信
    // socket.emit('room:ready', { roomId: currentRoom.id })
  }

  // start game
  const handleStartGame = () => {
    console.log('ゲーム開始')
    const playingRoom = { ...currentRoom, status: 'playing' as const }
    setCurrentRoom(playingRoom)
    navigate(`/game/${currentRoom.id}`)
    // TODO: WebSocketでサーバーに送信
    // socket.emit('room:start', { roomId: currentRoom.id })
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
      navigate('/lobby')
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
        navigate('/lobby')
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
            {isHost && !allReady && (
              <p className="mt-4 text-center text-sm text-gray-500">
                全員が Ready になるとゲームを開始できます
              </p>
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

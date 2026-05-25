import { useNavigate, useParams } from 'react-router-dom'
import { useLobbyStore } from '../stores/lobbyStore'
import { useEffect, useState } from 'react'
import { Button } from '../components/common/Button'
import { PlayerCard } from '../components/waitingRoom/PlayerCard'

export function WaitingRoom() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { currentRoom, setCurrentRoom } = useLobbyStore()
  const [isReady, setIsReady] = useState(false)

  // current userId(temporary)
  const currentUserId = 0

  useEffect(() => {
    // ルーム情報がない場合はロビーへ戻る
    if (!currentRoom || currentRoom.id !== roomId) {
      navigate('/lobby')
    }
  }, [currentRoom, roomId, navigate])

  if (!currentRoom) {
    return null
  }

  const currentPlayer = currentRoom.players.find(
    (p) => p.userId === currentUserId
  )
  const isHost = currentPlayer?.isHost || false
  const allReady = currentRoom.players.every((p) => p.isReady)
  const canStart = isHost && allReady && currentRoom.players.length >= 2

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
    // TODO: WebSocketでサーバーに送信
    // socket.emit('room:start', { roomId: currentRoom.id })
  }

  // leave room
  const handleLeaveRoom = () => {
    console.log('部屋を退出')
    setCurrentRoom(null)
    navigate('/lobby')
    // TODO: WebSocketでサーバーに送信
    // socket.emit('room:leave', { roomId: currentRoom.id })
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
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {/* プレイヤー一覧 */}
        <div className="mb-6">
          <h2 className="mb-4 text-xl font-bold text-gray-900">
            プレイヤー ({currentRoom.players.length} / {currentRoom.maxPlayers})
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
                className="flex items-center justify-center rounded-lg border-2 border-dashed 
  border-gray-300 bg-gray-50 p-4"
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
      </main>
    </div>
  )
}

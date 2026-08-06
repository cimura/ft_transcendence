import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { GameCanvas } from '../components/game/GameCanvas'
import { GameResultOverlay } from '../components/game/GameResultOverlay'
import { RetireConfirmDialog } from '../components/game/RetireConfirmDialog'
import { useRoomStore } from '../stores/roomStore'
import { useGameStore } from '../stores/gameStore'
import { useGameSocket } from '../hooks/useGameSocket'
import { useBrowserBackGuard } from '../hooks/useBrowserBackGuard'
import type { PlayerSnapshot } from '@ft_transcendence/shared/game-events.types'
import type { RoomSnapshot } from '@ft_transcendence/shared/rooms-events.types'
import { getRoom } from '../api/rooms'
import { logApiError } from '../api/errors'
import BackgroundVideo from '../components/common/BackgroundVideo'

export function GameRoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { currentRoom, rooms, setCurrentRoom } = useRoomStore()

  useEffect(() => {
    if (!roomId) {
      navigate('/home', { replace: true })
      return
    }

    if (currentRoom?.id === roomId) {
      if (currentRoom.status === 'waiting') {
        navigate(`/room/${currentRoom.id}`, { replace: true })
      }
      return
    }

    const room = rooms.find((item) => item.id === roomId)
    if (room) {
      setCurrentRoom(room)
      if (room.status === 'waiting') {
        navigate(`/room/${room.id}`, { replace: true })
      }
      return
    }

    let cancelled = false

    const loadRoom = async () => {
      try {
        const fetchedRoom = await getRoom(roomId)
        if (cancelled) return
        setCurrentRoom(fetchedRoom)
        if (fetchedRoom.status === 'waiting') {
          navigate(`/room/${fetchedRoom.id}`, { replace: true })
        }
      } catch (error) {
        logApiError('Failed to load game room:', error)
        if (!cancelled) {
          navigate('/home', { replace: true })
        }
      }
    }

    void loadRoom()

    return () => {
      cancelled = true
    }
  }, [
    navigate,
    roomId,
    rooms,
    setCurrentRoom,
    currentRoom?.id,
    currentRoom?.status,
  ])

  // ゲーム中は画面が1ビューポートに収まるため、縦スクロールを止める
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  if (!currentRoom) {
    return null
  }

  return <GameRoomView room={currentRoom} />
}

type GameRoomViewProps = {
  room: RoomSnapshot
}

function GameRoomView({ room }: GameRoomViewProps) {
  const navigate = useNavigate()
  const gameState = useGameStore((state) => state.gameState)
  const gamePhase = useGameStore((state) => state.gamePhase)
  const myPlayerId = useGameStore((state) => state.myPlayerId)
  const { socketRef, leaveGame } = useGameSocket(room.id)

  const [isRetireDialogOpen, setIsRetireDialogOpen] = useState(false)
  const retireResolverRef = useRef<((canExit: boolean) => void) | null>(null)

  const livingPlayers = Object.values(gameState?.players ?? {}).filter(
    (player: PlayerSnapshot) => player.alive
  ).length

  // 対戦中(countdown/playing)かつ自分がまだ生存中のときだけリタイア確認を挟む。
  const isInBattle = gamePhase === 'countdown' || gamePhase === 'playing'
  const isMeAlive =
    myPlayerId !== null && gameState.players[myPlayerId]?.alive === true
  const needsRetireConfirm = isInBattle && isMeAlive
  // バックボタン(popstate)経由でも同じ判定を使うため、最新値を ref にも反映しておく。
  const needsRetireConfirmRef = useRef(needsRetireConfirm)
  useEffect(() => {
    needsRetireConfirmRef.current = needsRetireConfirm
  }, [needsRetireConfirm])

  // ヘッダーの「ホームへ戻る」ボタンとブラウザのバックボタン、両方の退出経路を
  // この一本にまとめる。対戦中かつ生存中ならリタイア確認を挟み、確定したら
  // 必ず game:leave を送ってから離脱する(unmount 任せだと猶予待ちのゴースト
  // プレイヤーになってしまうため)。
  const requestExit = useCallback(async () => {
    if (needsRetireConfirmRef.current) {
      setIsRetireDialogOpen(true)
      const confirmed = await new Promise<boolean>((resolve) => {
        retireResolverRef.current = resolve
      })
      if (!confirmed) return false
    }
    leaveGame()
    return true
  }, [leaveGame])

  const { pushGuard } = useBrowserBackGuard({
    stateKey: 'gameExitGuard',
    guardValue: room.id,
    onBack: requestExit,
    onExit: () => navigate('/home', { replace: true }),
  })

  const handleBackToHome = () => {
    pushGuard()
    window.history.back()
  }

  const handleRetireConfirm = () => {
    setIsRetireDialogOpen(false)
    retireResolverRef.current?.(true)
    retireResolverRef.current = null
  }

  const handleRetireCancel = () => {
    setIsRetireDialogOpen(false)
    retireResolverRef.current?.(false)
    retireResolverRef.current = null
  }

  return (
    // ★ 背景色を削除し、全体を透過。テキストカラーをHomeに合わせる
    <div className="fixed inset-0 flex flex-col overflow-hidden text-cyan-50 select-none">
      {/* ★ 背景動画とHome画面共通のサイバーエフェクト */}
      <BackgroundVideo />
      <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,255,255,0.05)_50%)] bg-[size:100%_4px] pointer-events-none z-0" />
      <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-cyan-500/20 to-transparent pointer-events-none z-0" />

      {/* ★ ヘッダー（サイバー調） */}
      <header className="shrink-0 border-b border-cyan-400/60 bg-black/40 backdrop-blur-md shadow-[0_4px_20px_rgba(0,255,255,0.2)] z-10 relative">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-mono font-semibold text-cyan-300 tracking-widest">
              BOMBERMAN_SYSTEM //
            </p>
            <h1 className="text-2xl font-bold tracking-wider">{room.name}</h1>
          </div>

          {/* ★ 生存人数表示（メンバーの機能）とサイバー調ボタン（あなたのデザイン）の結合 */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-20 items-center justify-center whitespace-nowrap rounded-md bg-gray-800/80 border border-cyan-500/30 px-3 text-sm font-semibold text-cyan-100">
              生存 {livingPlayers}
            </div>
            <button
              onClick={handleBackToHome}
              className="group relative px-6 py-2 bg-cyan-900/40 backdrop-blur-md border border-cyan-400/60 transition-all duration-300 hover:border-cyan-300 hover:bg-cyan-800/60 hover:shadow-[0_0_15px_rgba(0,255,255,0.4)] hover:-translate-y-0.5"
              style={{
                clipPath:
                  'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
              }}
            >
              <div className="absolute top-1 right-1 w-1 h-1 bg-cyan-300 rounded-full shadow-[0_0_5px_rgba(0,255,255,0.8)]" />
              <div className="absolute bottom-1 left-1 w-1 h-1 bg-cyan-300 rounded-full shadow-[0_0_5px_rgba(0,255,255,0.8)]" />
              <span className="text-sm font-bold text-white tracking-widest drop-shadow-md">
                ホームへ戻る
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ★ メイン領域（メンバーの socketRef 渡しに修正しつつ、あなたのレイアウトクラスを適用） */}
      <main className="relative min-h-0 flex-1 z-10">
        <GameCanvas socketRef={socketRef} />
        <GameResultOverlay />
      </main>

      <RetireConfirmDialog
        isOpen={isRetireDialogOpen}
        onConfirm={handleRetireConfirm}
        onCancel={handleRetireCancel}
      />
    </div>
  )
}

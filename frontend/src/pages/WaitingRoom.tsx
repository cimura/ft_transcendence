// frontend/src/pages/WaitingRoom.tsx
import { useNavigate, useParams } from 'react-router-dom'
import { useRoomStore } from '../stores/roomStore'
import { useCallback, useEffect, useRef, useState } from 'react'
import { PlayerCard } from '../components/waitingRoom/PlayerCard'
import { ChatPanel } from '../components/waitingRoom/ChatPanel'
import { GameMapPreview } from '../components/game/preview/GameMapPreview'
import { useAuthStore, useCurrentUser } from '../stores/authStore'
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
import {
  getApiErrorMessage,
  isRoomUnavailableError,
  logApiError,
} from '../api/errors'
import { isRoomId } from '../utils/roomId'
import { RoomNotFound } from '../components/common/RoomNotFound'
import { useFriends } from '../hooks/friends/useFriends'
import type { RoomSnapshot } from '@ft_transcendence/shared/rooms-events.types'

export function WaitingRoom() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { currentRoom, setCurrentRoom, removeRoom, upsertRoom } = useRoomStore()
  const currentUser = useCurrentUser()
  const accessToken = useAuthStore((state) => state.accessToken)
  const [isLoadingRoom, setIsLoadingRoom] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const currentUserId = currentUser.id
  const validRoomId = isRoomId(roomId) ? roomId : undefined

  const { leaveRoom: emitRoomLeave } = useRoomSocket(validRoomId)

  // 明示的な退出中は、currentRoom が空になったことをトリガーに再joinしないようにするフラグ
  // (ホストが部屋を削除した等の外部要因による currentRoom クリアとは区別する必要がある)
  const isLeavingRef = useRef(false)
  const hasBackGuardRef = useRef(false)
  const hasCompletedLeaveRef = useRef(false)

  useEffect(() => {
    if (!validRoomId) return

    let cancelled = false

    const loadRoom = async () => {
      if (isLeavingRef.current) {
        setIsLoadingRoom(false)
        return
      }

      setIsLoadingRoom(true)
      try {
        // A room held in the store may only be a lobby snapshot. It can also
        // be overwritten by an older lobby event while navigation is in
        // progress. Joining is idempotent on the backend, so always confirm
        // membership when the waiting-room route is entered.
        const joinedRoom = await joinRoom(validRoomId)
        if (cancelled) return
        upsertRoom(joinedRoom)
        setCurrentRoom(joinedRoom)
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 409) {
          try {
            const room = await getRoom(validRoomId)
            if (cancelled) return
            upsertRoom(room)
            setCurrentRoom(room)
            if (room.status === 'playing') {
              navigate(`/game/${room.id}`, { replace: true })
            }
          } catch (refreshError) {
            if (!isRoomUnavailableError(refreshError)) {
              logApiError('Failed to refresh room:', refreshError)
            }
            if (!cancelled) setNotFound(true)
          }
          return
        }

        if (!isRoomUnavailableError(error)) {
          logApiError('Failed to join room:', error)
        }
        if (!cancelled) setNotFound(true)
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
  }, [navigate, validRoomId, setCurrentRoom, upsertRoom])

  useEffect(() => {
    if (
      currentRoom &&
      currentRoom.id === validRoomId &&
      currentRoom.status === 'playing'
    ) {
      navigate(`/game/${currentRoom.id}`, { replace: true })
    }
  }, [currentRoom, navigate, validRoomId])

  const handleLeaveRoom = useCallback(async () => {
    if (isLeavingRef.current || !currentRoom) return false
    isLeavingRef.current = true
    try {
      const result = await leaveRoom(currentRoom.id)
      if (result) {
        upsertRoom(result)
      } else {
        removeRoom(currentRoom.id)
      }
      emitRoomLeave()
      return true
    } catch (error) {
      if (
        axios.isAxiosError(error) &&
        (error.response?.status === 403 || error.response?.status === 404)
      ) {
        emitRoomLeave()
        removeRoom(currentRoom.id)
        return true
      }
      isLeavingRef.current = false
      logApiError('Failed to leave room:', error)
      return false
    }
  }, [currentRoom, emitRoomLeave, removeRoom, upsertRoom])

  // Keep the room mounted for the first browser Back event. Without this guard,
  // React Router may unmount the page before its popstate handler can leave the
  // room, which also makes behavior depend on how the host/guest arrived here.
  // Skip entirely when the room never loaded (invalid ID or notFound) — there's
  // nothing to leave, and the guard would otherwise trap the browser Back
  // button on the error screen.
  useEffect(() => {
    if (!validRoomId || notFound) return

    if (!hasBackGuardRef.current && !isLeavingRef.current) {
      window.history.pushState(
        { ...window.history.state, roomExitGuard: validRoomId },
        '',
        window.location.href
      )
      hasBackGuardRef.current = true
    }

    const handleBrowserBack = async () => {
      if (hasCompletedLeaveRef.current) {
        hasBackGuardRef.current = false
        navigate('/lobby', { replace: true })
        setCurrentRoom(null)
        return
      }

      // Back has just consumed the guard entry. Restore it immediately so a
      // repeated Back cannot leave the page while the API request is pending.
      window.history.pushState(
        { ...window.history.state, roomExitGuard: validRoomId },
        '',
        window.location.href
      )
      hasBackGuardRef.current = true

      const didLeave = await handleLeaveRoom()
      if (didLeave) {
        hasCompletedLeaveRef.current = true
        window.history.back()
      }
    }

    window.addEventListener('popstate', handleBrowserBack)
    return () => window.removeEventListener('popstate', handleBrowserBack)
  }, [handleLeaveRoom, navigate, notFound, validRoomId, setCurrentRoom])

  const handleEmergencyExit = () => {
    if (!hasBackGuardRef.current) {
      window.history.pushState(
        { ...window.history.state, roomExitGuard: roomId },
        '',
        window.location.href
      )
      hasBackGuardRef.current = true
    }
    window.history.back()
  }

  if (!validRoomId || notFound) {
    return <RoomNotFound />
  }

  if (!currentRoom || isLoadingRoom) {
    return null
  }

  const currentPlayer = currentRoom.players.find(
    (p) => p.userId === currentUserId
  )
  const isHost = currentPlayer?.isHost || false
  const isReady = currentPlayer?.isReady || false
  const allReady = currentRoom.players.every((p) => p.isReady)
  const hasEnoughPlayers = currentRoom.players.length === currentRoom.maxPlayers
  const canStart = isHost && allReady && hasEnoughPlayers

  const handleToggleReady = async () => {
    try {
      const room = await setRoomReady(currentRoom.id, !isReady)
      upsertRoom(room)
      setCurrentRoom(room)
    } catch (error) {
      logApiError('Failed to update ready state:', error)
    }
  }

  const handleStartGame = async () => {
    try {
      const room = await startRoom(currentRoom.id)
      upsertRoom(room)
      setCurrentRoom(room)
      navigate(`/game/${room.id}`)
    } catch (error) {
      logApiError('Failed to start game:', error)
    }
  }

  return (
    <div className="min-h-screen bg-transparent text-cyan-100 font-sans relative">
      {/* うっすらとした背景グリッド */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />

      {/* ヘッダー: コマンドセンター風 */}
      <header className="bg-black/50 backdrop-blur-md border-b border-cyan-500/30 relative z-10 shadow-[0_4px_30px_rgba(0,255,255,0.1)]">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 rounded-full border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(0,255,255,0.4)]">
                <span className="animate-ping w-4 h-4 bg-cyan-400 rounded-full"></span>
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-500 drop-shadow-[0_0_8px_rgba(0,255,255,0.3)]">
                  {currentRoom.name}
                </h1>
                <p className="mt-1 text-xs font-mono text-cyan-500 tracking-[0.2em]">
                  HOST_LINK //{' '}
                  <span className="text-cyan-200">{currentRoom.hostName}</span>
                </p>
              </div>
            </div>
            <button
              onClick={handleEmergencyExit}
              className="group relative px-6 py-2 rounded-full border border-red-500/50 bg-red-950/40 text-red-300 font-bold tracking-widest overflow-hidden transition-all hover:bg-red-900/60 hover:text-white hover:border-red-400 hover:shadow-[0_0_20px_rgba(255,0,0,0.5)]"
            >
              <div className="absolute inset-0 bg-red-500/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <span className="relative z-10 text-sm">EMERGENCY EXIT</span>
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)_360px]">
          {/* 左側: プレイヤーリスト & アクション */}
          {/* 修正: h-full を追加し、親グリッドの高さに合わせる */}
          <section className="flex flex-col gap-6 h-full">
            {/* 修正: flex-1 を追加して、このパネルが縦の余白を埋めるようにする */}
            <div className="rounded-2xl border border-cyan-500/30 bg-black/40 backdrop-blur-md p-5 flex flex-col flex-1 shadow-[0_0_20px_rgba(0,255,255,0.05)]">
              <div className="flex items-center justify-between mb-4 border-b border-cyan-500/20 pb-2">
                <h2 className="text-lg font-bold tracking-widest text-cyan-200">
                  SQUAD{' '}
                  <span className="text-xs text-cyan-500 font-mono ml-2">
                    [{currentRoom.players.length}/{currentRoom.maxPlayers}]
                  </span>
                </h2>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
              </div>

              {/* 修正: flex-1 overflow-y-auto を追加し、プレイヤーが増えたらスクロールするようにする */}
              <div className="space-y-3 flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-cyan-700/50 scrollbar-track-transparent">
                {currentRoom.players.map((player) => (
                  <PlayerCard key={player.userId} player={player} />
                ))}

                {/* 空きスロット */}
                {Array.from({
                  length: currentRoom.maxPlayers - currentRoom.players.length,
                }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="flex items-center justify-center rounded-lg border border-dashed border-cyan-800/50 bg-cyan-950/20 p-4 transition-all hover:bg-cyan-900/30"
                  >
                    <span className="text-cyan-600/60 font-mono text-sm tracking-[0.2em]">
                      WAITING FOR SIGNAL...
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* アクションボタン (Ready / Start) */}
            {/* 修正: shrink-0 を追加し、上に押し潰されないようにする */}
            <div className="w-full shrink-0">
              {!isHost && (
                <button
                  onClick={handleToggleReady}
                  className={`w-full relative overflow-hidden rounded-xl border py-4 font-bold tracking-widest transition-all duration-300 hover:-translate-y-1 ${
                    isReady
                      ? 'border-emerald-400 bg-emerald-900/40 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:bg-emerald-800/60'
                      : 'border-yellow-500/60 bg-yellow-900/40 text-yellow-100 shadow-[0_0_15px_rgba(234,179,8,0.2)] hover:border-yellow-400 hover:bg-yellow-800/50 hover:shadow-[0_0_25px_rgba(234,179,8,0.4)]'
                  }`}
                >
                  <span className="relative z-10">
                    {isReady
                      ? 'READY TO LAUNCH'
                      : 'STANDBY (クリックで準備完了)'}
                  </span>
                </button>
              )}

              {isHost && (
                <button
                  onClick={handleStartGame}
                  disabled={!canStart}
                  className={`w-full relative overflow-hidden rounded-xl border py-4 font-bold tracking-[0.2em] transition-all duration-300 ${
                    canStart
                      ? 'border-cyan-400 bg-cyan-600/40 text-white shadow-[0_0_30px_rgba(0,255,255,0.5)] hover:bg-cyan-500/60 hover:shadow-[0_0_40px_rgba(0,255,255,0.7)] hover:-translate-y-1 hover:scale-[1.02]'
                      : 'border-cyan-900/50 bg-black/40 text-cyan-700/50 cursor-not-allowed'
                  }`}
                >
                  <span className="relative z-10">
                    {canStart
                      ? 'LAUNCH SEQUENCE INITIATE'
                      : 'WAITING FOR ALL CREW...'}
                  </span>
                  {canStart && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                  )}
                </button>
              )}
            </div>

            {/* 修正: shrink-0 を追加 */}
            {isHost && currentRoom.status === 'waiting' && (
              <div className="shrink-0">
                <RoomInviteSection currentRoom={currentRoom} />
              </div>
            )}
          </section>

          {/* 中央: マップ・ゲーム情報 */}
          {/* 修正: h-full を追加 */}
          <section className="rounded-2xl border border-cyan-500/30 bg-black/40 p-6 backdrop-blur-md shadow-[0_0_30px_rgba(0,255,255,0.05)] relative overflow-hidden flex flex-col h-full">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

            <h2 className="text-xl font-bold tracking-widest text-cyan-100 flex items-center gap-3">
              <span className="w-1 h-6 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(0,255,255,0.8)]" />
              MISSION BRIEFING
            </h2>

            <div className="mt-6 flex-1 flex flex-col">
              <div className="flex justify-between items-end mb-2">
                <p className="text-xs font-mono tracking-widest text-cyan-400/80">
                  TACTICAL MAP PREVIEW
                </p>
                <p className="text-[10px] font-mono text-cyan-600">
                  RENDER_MODE: VIRTUAL
                </p>
              </div>

              {/* マッププレビュー枠 */}
              <div className="rounded-xl border border-cyan-500/40 p-1 bg-black/60 shadow-[inset_0_0_20px_rgba(0,255,255,0.1)] flex-1 min-h-[250px] relative">
                <GameMapPreview />
                {/* 走査線エフェクト */}
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,255,255,0.05)_50%)] bg-[size:100%_4px]" />
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-cyan-900/50 bg-cyan-950/20 p-4 transition-colors hover:border-cyan-500/50 hover:bg-cyan-900/30">
                <p className="text-[10px] font-mono tracking-widest text-cyan-500">
                  PROTOCOL
                </p>
                <p className="mt-1 text-lg font-bold text-cyan-100 tracking-wider">
                  ボンバーマン
                </p>
              </div>
              <div className="rounded-lg border border-cyan-900/50 bg-cyan-950/20 p-4 transition-colors hover:border-cyan-500/50 hover:bg-cyan-900/30">
                <p className="text-[10px] font-mono tracking-widest text-cyan-500">
                  OBJECTIVE
                </p>
                <p className="mt-1 text-sm font-medium text-cyan-100">
                  爆弾で相手を排除し、最後まで生存せよ
                </p>
              </div>
              <div className="rounded-lg border border-cyan-900/50 bg-cyan-950/20 p-4 transition-colors hover:border-cyan-500/50 hover:bg-cyan-900/30">
                <p className="text-[10px] font-mono tracking-widest text-cyan-500">
                  CONTROLS
                </p>
                <p className="mt-1 text-sm font-medium text-cyan-100 font-sans">
                  <kbd className="px-1.5 py-0.5 rounded bg-cyan-900/50 border border-cyan-600 text-cyan-300 mx-0.5">
                    WASD
                  </kbd>{' '}
                  / 矢印で移動
                  <br />
                  <kbd className="px-1.5 py-0.5 rounded bg-cyan-900/50 border border-cyan-600 text-cyan-300 mx-0.5 mt-1 inline-block">
                    Space
                  </kbd>{' '}
                  で爆弾設置
                </p>
              </div>
              <div className="rounded-lg border border-cyan-900/50 bg-cyan-950/20 p-4 transition-colors hover:border-cyan-500/50 hover:bg-cyan-900/30">
                <p className="text-[10px] font-mono tracking-widest text-cyan-500">
                  CAPACITY
                </p>
                <p className="mt-1 text-lg font-bold text-cyan-100">
                  MAX {currentRoom.maxPlayers} UNITS
                </p>
              </div>
            </div>

            <div className="mt-6 relative h-24 w-full overflow-hidden rounded-lg border border-cyan-900/50 bg-cyan-950/20 flex items-center justify-center group shadow-[inset_0_0_20px_rgba(0,255,255,0.05)]">
              {/* デジタルグリッド背景 */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.1)_1px,transparent_1px)] bg-[size:12px_12px] opacity-40" />

              {/* サイバーパンク風スキャンライン */}
              <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,255,255,0.05)_50%)] bg-[size:100%_4px] pointer-events-none" />

              {/* ワイヤーフレーム風マッコウクジラ SVG */}
              <svg
                className="relative z-10 w-full h-full max-h-16 text-cyan-500/70 drop-shadow-[0_0_5px_rgba(0,255,255,0.4)] group-hover:text-cyan-300 group-hover:drop-shadow-[0_0_10px_rgba(0,255,255,0.8)] transition-all duration-500"
                viewBox="0 0 120 40"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {/* 胴体と頭（マッコウクジラ特有の大きな四角い頭部） */}
                <path
                  d="M 15,15 L 45,12 L 70,16 L 90,22 L 105,18 L 102,24 L 105,30 L 90,26 L 70,32 L 40,32 L 20,29 L 12,25 L 12,18 Z"
                  fill="rgba(0,255,255,0.05)"
                />

                {/* 狭い下あご */}
                <path d="M 12,25 L 30,26 L 40,28" strokeDasharray="1 2" />

                {/* 胸ビレ */}
                <path d="M 42,28 L 48,36 L 53,29" fill="rgba(0,255,255,0.1)" />

                {/* 尾びれの内側のライン */}
                <path
                  d="M 90,24 L 102,24"
                  strokeWidth="0.5"
                  strokeDasharray="1 1"
                />

                {/* デジタルな装飾要素 */}
                {/* 目 (四角いセンサー風) */}
                <rect
                  x="25"
                  y="21"
                  width="1.5"
                  height="1.5"
                  fill="currentColor"
                />
                <rect
                  x="23"
                  y="19"
                  width="5"
                  height="5"
                  strokeWidth="0.2"
                  strokeDasharray="1 1"
                />

                {/* ターゲットクロスヘア（スキャン中を演出） */}
                <path
                  d="M 60,10 L 60,38 M 50,24 L 70,24"
                  stroke="rgba(0,255,255,0.3)"
                  strokeWidth="0.3"
                  strokeDasharray="2 2"
                />
                <circle
                  cx="60"
                  cy="24"
                  r="8"
                  stroke="rgba(0,255,255,0.2)"
                  strokeWidth="0.3"
                />

                {/* スキャンデータポイント */}
                <circle cx="45" cy="12" r="0.5" fill="currentColor" />
                <circle cx="70" cy="16" r="0.5" fill="currentColor" />
                <circle cx="90" cy="22" r="0.5" fill="currentColor" />
              </svg>

              {/* 右下の学名データテキスト */}
              <div className="absolute bottom-1.5 right-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_5px_rgba(0,255,255,0.8)]" />
                <span className="text-[8px] font-mono text-cyan-500/80 tracking-widest drop-shadow-sm">
                  ENTITY: PHYSETER_MACROCEPHALUS
                </span>
              </div>
            </div>
          </section>

          {/* 右側: チャットパネル */}
          <ChatPanel
            roomId={validRoomId}
            currentUser={currentUser}
            accessToken={accessToken}
          />
        </div>
      </main>
    </div>
  )
}

function RoomInviteSection({ currentRoom }: { currentRoom: RoomSnapshot }) {
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
        `${invitedFriend?.username ?? 'TARGET'} へ通信リンクを送信しました`
      )
      setSelectedInviteeId('')
    } catch (error) {
      setInviteError(getApiErrorMessage(error, '通信の送信に失敗しました'))
    } finally {
      setInviteLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-cyan-500/30 bg-black/40 p-5 backdrop-blur-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-16 h-16 border-t border-r border-cyan-500/20 rounded-tr-xl pointer-events-none" />

      <h3 className="text-xs font-bold tracking-widest text-cyan-400 mb-3 flex items-center gap-2">
        <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
        INVITE OPERATOR
      </h3>
      <div className="flex gap-2">
        <select
          value={selectedInviteeId}
          onChange={(event) => setSelectedInviteeId(event.target.value)}
          className="min-w-0 flex-1 rounded-md border border-cyan-700 bg-cyan-950/30 px-3 py-2 text-sm text-cyan-100 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
        >
          <option value="" className="bg-gray-900 text-cyan-500/50">
            対象を選択
          </option>
          {friends
            .filter(
              (friend) =>
                !currentRoom.players.some(
                  (player) => player.userId === friend.id
                )
            )
            .map((friend) => (
              <option
                key={friend.id}
                value={friend.id}
                className="bg-gray-900 text-cyan-100"
              >
                {friend.username}
              </option>
            ))}
        </select>
        <button
          onClick={handleInviteFriend}
          disabled={!selectedInviteeId || inviteLoading}
          className="px-4 py-2 rounded-md bg-cyan-700/50 border border-cyan-500 text-cyan-50 text-sm font-bold tracking-wider hover:bg-cyan-600/80 hover:shadow-[0_0_10px_rgba(0,255,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          送信
        </button>
      </div>
      {inviteMessage && (
        <p className="mt-3 text-xs tracking-wider text-emerald-400 flex items-center gap-1">
          <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" />{' '}
          {inviteMessage}
        </p>
      )}
      {inviteError && (
        <p className="mt-3 text-xs tracking-wider text-red-400 flex items-center gap-1">
          <span className="w-1 h-1 bg-red-400 rounded-full" /> {inviteError}
        </p>
      )}
    </div>
  )
}

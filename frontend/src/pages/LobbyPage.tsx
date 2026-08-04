import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuthStore } from '../stores/authStore'
import { useRoomStore } from '../stores/roomStore'
import { useLobbySocket } from '../hooks/useLobbySocket'
import { getRooms, createRoom, joinRoom, getRoom } from '../api/rooms'
import { logApiError } from '../api/errors'
import { RoomList } from '../components/lobby/RoomList'
import { CreateRoomModal } from '../components/lobby/CreateRoomModal'
import type { CreateRoomDto } from '../types'

export function LobbyPage() {
  const navigate = useNavigate()
  const { currentUser } = useAuthStore()
  const { rooms, setRooms, upsertRoom, removeRoom, setCurrentRoom } =
    useRoomStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  useLobbySocket()

  useEffect(() => {
    let cancelled = false

    getRooms('waiting')
      .then((initialRooms) => {
        if (!cancelled) setRooms(initialRooms)
      })
      .catch((error) => {
        logApiError('Failed to load rooms:', error)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 初回マウント時のみ実行(以降はソケットで同期)
  }, [])

  const visibleRooms = useMemo(
    () => rooms.filter((room) => room.status === 'waiting'),
    [rooms]
  )

  const handleCreateRoom = async (dto: CreateRoomDto) => {
    if (isCreating) return

    setIsCreating(true)
    try {
      const room = await createRoom(dto)
      upsertRoom(room)
      setCurrentRoom(room)
      setIsModalOpen(false)
      navigate(`/room/${room.id}`)
    } catch (error) {
      logApiError('Failed to create room:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinRoom = async (roomId: string) => {
    const user = currentUser
    if (!user) return

    try {
      const joinedRoom = await joinRoom(roomId)
      upsertRoom(joinedRoom)
      setCurrentRoom(joinedRoom)
      navigate(`/room/${roomId}`)
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status

        // 満員/開始済みなどで参加できなかった部屋は一覧から除去する
        if (status === 403 || status === 404) {
          removeRoom(roomId)
          logApiError('Failed to join room:', error)
          return
        }

        // 参加済みだった/満員だった等の競合は最新状態を取得して復帰を試みる
        if (status === 409) {
          try {
            const latestRoom = await getRoom(roomId)

            if (
              latestRoom.players.some(
                (player: { userId: string }) => player.userId === user!.id
              )
            ) {
              upsertRoom(latestRoom)
              setCurrentRoom(latestRoom)
              navigate(`/room/${roomId}`)
              return
            }

            upsertRoom(latestRoom)
          } catch (refreshError) {
            if (
              axios.isAxiosError(refreshError) &&
              [403, 404].includes(refreshError.response?.status ?? 0)
            ) {
              removeRoom(roomId)
            }
            logApiError(
              'Failed to refresh room after join conflict:',
              refreshError
            )
          }
          return
        }
      }

      logApiError('Failed to join room:', error)
    }
  }

  return (
    <div className="min-h-screen bg-transparent text-cyan-100 font-sans relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />

      <header className="bg-black/50 backdrop-blur-md border-b border-cyan-500/30 relative z-10 shadow-[0_4px_30px_rgba(0,255,255,0.1)]">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 rounded-full border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(0,255,255,0.4)]">
                <span className="animate-ping w-4 h-4 bg-cyan-400 rounded-full"></span>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-500 drop-shadow-[0_0_8px_rgba(0,255,255,0.3)]">
                  LOBBY
                </h1>
                <p className="mt-1 text-xs font-mono text-cyan-500 tracking-[0.2em]">
                  ACTIVE_ROOMS //{' '}
                  <span className="text-cyan-200">{visibleRooms.length}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/home')}
                className="rounded-full border border-cyan-700/60 bg-black/30 px-5 py-2 text-xs font-bold tracking-widest text-cyan-300 hover:border-cyan-400 hover:text-white transition-colors"
              >
                ← HOME
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="rounded-full border border-cyan-400/60 bg-cyan-600/40 px-6 py-2 text-xs font-bold tracking-widest text-white shadow-[0_0_15px_rgba(0,255,255,0.3)] hover:bg-cyan-500/60 hover:shadow-[0_0_25px_rgba(0,255,255,0.5)] transition-all"
              >
                + CREATE ROOM
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <RoomList rooms={visibleRooms} onJoin={handleJoinRoom} />
      </main>

      <CreateRoomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateRoom}
      />
    </div>
  )
}

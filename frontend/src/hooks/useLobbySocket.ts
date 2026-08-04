import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useRoomStore } from '../stores/roomStore'
import { useAuthStore } from '../stores/authStore'
import type {
  RoomClientToServerEvents,
  RoomServerToClientEvents,
  RoomSnapshot,
} from '@ft_transcendence/shared/rooms-events.types'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || window.location.origin
const ROOMS_NAMESPACE = `${BACKEND_URL.replace(/\/$/, '')}/rooms`

/**
 * ロビー画面用のソケット接続。/rooms namespace の "lobby" ルームに参加し、
 * 待機中(online)ルームの作成・更新・削除をリアルタイムに roomStore へ反映する。
 */
export function useLobbySocket() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const authStatus = useAuthStore((state) => state.authStatus)
  const socketRef = useRef<Socket<
    RoomServerToClientEvents,
    RoomClientToServerEvents
  > | null>(null)

  useEffect(() => {
    if (!accessToken || authStatus !== 'authenticated') return

    const { setRooms, upsertRoom, removeRoom } = useRoomStore.getState()

    const socket = io(ROOMS_NAMESPACE, {
      autoConnect: false,
      auth: { token: `Bearer ${accessToken}` },
    })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('lobby:join')
    })

    socket.on('lobby:rooms', (rooms: RoomSnapshot[]) => {
      setRooms(rooms)
    })

    socket.on('room:created', (snapshot: RoomSnapshot) => {
      upsertRoom(snapshot)
    })

    socket.on('room:updated', (snapshot: RoomSnapshot) => {
      upsertRoom(snapshot)
    })

    socket.on(
      'room:deleted',
      ({ roomId }: Parameters<RoomServerToClientEvents['room:deleted']>[0]) => {
        removeRoom(roomId)
      }
    )

    socket.connect()

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [accessToken, authStatus])
}

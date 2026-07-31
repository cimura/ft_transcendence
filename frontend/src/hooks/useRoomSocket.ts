import { useCallback, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useRoomStore } from '../stores/roomStore'
import { useAuthStore } from '../stores/authStore'
import { toGameRoom } from '../utils/roomSnapshot'
import type {
  RoomClientToServerEvents,
  RoomServerToClientEvents,
  RoomSnapshot,
} from '@ft_transcendence/shared/rooms-events.types'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || window.location.origin
const ROOMS_NAMESPACE = `${BACKEND_URL.replace(/\/$/, '')}/rooms`

export function useRoomSocket(roomId?: string) {
  const accessToken = useAuthStore((state) => state.accessToken)
  const socketRef = useRef<Socket<
    RoomServerToClientEvents,
    RoomClientToServerEvents
  > | null>(null)

  useEffect(() => {
    if (!roomId || !accessToken) return

    const { upsertRoom, removeRoom } = useRoomStore.getState()

    const socket = io(ROOMS_NAMESPACE, {
      autoConnect: false,
      auth: { token: `Bearer ${accessToken}` },
    })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('room:join', { roomId })
    })

    socket.on('connect_error', (error: Error) => {
      console.error('[RoomSocket] connection error:', error)
    })

    socket.on('disconnect', (reason: string) => {
      console.log('[RoomSocket] disconnected:', reason)
    })

    socket.on('room:updated', (snapshot: RoomSnapshot) => {
      upsertRoom(toGameRoom(snapshot))
    })

    socket.on(
      'room:deleted',
      ({ roomId }: Parameters<RoomServerToClientEvents['room:deleted']>[0]) => {
        removeRoom(roomId)
      }
    )

    socket.on(
      'room:error',
      ({ message }: Parameters<RoomServerToClientEvents['room:error']>[0]) => {
        console.error('[RoomSocket] error:', message)
      }
    )

    socket.connect()

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [accessToken, roomId])

  // 明示的な退出操作(退出ボタン)専用。unmount(リロード/タブ閉じ/ゲーム開始遷移など)には
  // 紐付けない — それらは切断として扱われ、バックエンド側の猶予付き自動退出に委ねる。
  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('room:leave')
  }, [])

  return { leaveRoom }
}

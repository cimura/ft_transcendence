import { useCallback, useEffect, useRef } from 'react'
import { Socket } from 'socket.io-client'
import { useRoomStore } from '../stores/roomStore'
import { useAuthStore } from '../stores/authStore'
import { connectSocket, createSocket, releaseSocket } from '../utils/socket'
import type {
  RoomClientToServerEvents,
  RoomServerToClientEvents,
  RoomSnapshot,
} from '@ft_transcendence/shared/rooms-events.types'

export function useRoomSocket(roomId?: string) {
  const accessToken = useAuthStore((state) => state.accessToken)
  const authStatus = useAuthStore((state) => state.authStatus)
  const socketRef = useRef<Socket<
    RoomServerToClientEvents,
    RoomClientToServerEvents
  > | null>(null)

  useEffect(() => {
    if (!roomId || !accessToken || authStatus !== 'authenticated') return

    const { upsertRoom, removeRoom } = useRoomStore.getState()

    const socket = createSocket<
      RoomServerToClientEvents,
      RoomClientToServerEvents
    >('/rooms', accessToken, { autoConnect: false })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('room:join', { roomId })
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

    connectSocket(socket)

    return () => {
      releaseSocket(socket)
      socketRef.current = null
    }
  }, [accessToken, roomId, authStatus])

  // 明示的な退出操作(退出ボタン)専用。unmount(リロード/タブ閉じ/ゲーム開始遷移など)には
  // 紐付けない — それらは切断として扱われ、バックエンド側の猶予付き自動退出に委ねる。
  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('room:leave')
  }, [])

  return { leaveRoom }
}

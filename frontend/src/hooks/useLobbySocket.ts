import { useEffect, useRef, useState } from 'react'
import { Socket } from 'socket.io-client'
import { useRoomStore } from '../stores/roomStore'
import { useAuthStore } from '../stores/authStore'
import { createSocket } from '../utils/socket'
import type {
  RoomClientToServerEvents,
  RoomServerToClientEvents,
  RoomRejoinPayload,
  RoomSnapshot,
} from '@ft_transcendence/shared/rooms-events.types'

/**
 * ロビー画面用のソケット接続。/rooms namespace の "lobby" ルームに参加し、
 * 待機中(online)ルームの作成・更新・削除をリアルタイムに roomStore へ反映する。
 *
 * また、切断の猶予時間(30秒)内にロビーへ戻ってきた場合、サーバーから
 * "room:rejoin" が届くことがある。これは元いたルームへ強制的に復帰させるための
 * シグナルで、遷移先を rejoinTarget として返す(実際の navigate は呼び出し側の責務)。
 */
export function useLobbySocket() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const authStatus = useAuthStore((state) => state.authStatus)
  const socketRef = useRef<Socket<
    RoomServerToClientEvents,
    RoomClientToServerEvents
  > | null>(null)
  const [rejoinTarget, setRejoinTarget] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken || authStatus !== 'authenticated') return

    const { setRooms, upsertRoom, removeRoom, setCurrentRoom } = useRoomStore.getState()
    // 1回のマウントにつき復帰は一度だけ発火させる(再接続時に同じイベントが
    // 再度届いても、既に遷移先を確定させた後なら無視する)。
    let hasRejoined = false

    const socket = createSocket<
      RoomServerToClientEvents,
      RoomClientToServerEvents
    >('/rooms', accessToken, { autoConnect: false })
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

    socket.on('room:rejoin', ({ room, inGame }: RoomRejoinPayload) => {
      if (hasRejoined) return
      hasRejoined = true
      upsertRoom(room)
      setCurrentRoom(room)
      setRejoinTarget(inGame ? `/game/${room.id}` : `/room/${room.id}`)
    })

    socket.connect()

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [accessToken, authStatus])

  return { rejoinTarget }
}

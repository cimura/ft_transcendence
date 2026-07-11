import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import type { GameRoom } from '../types'
import { useRoomStore } from '../stores/roomStore'
import type {
  RoomClientToServerEvents,
  RoomServerToClientEvents,
  RoomSnapshot,
} from '@ft_transcendence/shared/room-events.types'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || window.location.origin
const ROOMS_NAMESPACE = `${BACKEND_URL.replace(/\/$/, '')}/rooms`

export function useRoomSocket(roomId?: string) {
  const socketRef = useRef<Socket<
    RoomServerToClientEvents,
    RoomClientToServerEvents
  > | null>(null)

  useEffect(() => {
    if (!roomId) return

    const { upsertRoom, removeRoom } = useRoomStore.getState()
    const accessToken = localStorage.getItem('accessToken')

    const socket = io(ROOMS_NAMESPACE, {
      autoConnect: false,
      auth: accessToken ? { token: `Bearer ${accessToken}` } : undefined,
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
      const room: GameRoom = {
        id: snapshot.id,
        name: snapshot.name,
        hostId: snapshot.hostId,
        hostName: snapshot.hostName,
        players: snapshot.players.map((p) => ({
          userId: p.userId,
          username: p.username,
          avatarUrl: p.avatarUrl ?? undefined,
          isReady: p.isReady,
          isHost: p.isHost,
        })),
        maxPlayers: snapshot.maxPlayers as 2 | 3 | 4,
        status: snapshot.status,
        mode: snapshot.mode,
        mapId: snapshot.mapId,
        createdAt: snapshot.createdAt,
        updatedAt: snapshot.updatedAt,
        startedAt: snapshot.startedAt,
        finishedAt: snapshot.finishedAt,
      }
      upsertRoom(room)
    })

    socket.on('room:deleted', ({ roomId }: { roomId: string }) => {
      removeRoom(roomId)
    })

    socket.on('room:error', ({ message }: { message: string }) => {
      console.error('[RoomSocket] error:', message)
    })

    socket.connect()

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [roomId])
}

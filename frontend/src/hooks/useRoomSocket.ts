import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import type { GameRoom } from '../types'
import { useRoomStore } from '../stores/roomStore'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || window.location.origin

export function useRoomSocket(roomId?: string) {
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!roomId) return

    const { upsertRoom, removeRoom } = useRoomStore.getState()
    const accessToken = localStorage.getItem('accessToken')

    const socket = io(BACKEND_URL, {
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

    socket.on('room:updated', (room: GameRoom) => {
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

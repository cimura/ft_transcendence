import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import type { GameRoom } from '../types'
import { useLobbyStore } from '../stores/lobbyStore'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'

export function useLobbySocket() {
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const { upsertRoom, removeRoom, setRooms } = useLobbyStore.getState()

    // connect socket
    const socket = io(BACKEND_URL, {
      autoConnect: false,
      // if auth needs
      // auth: {
      //   token: localStorage.getItem('token')
      // }
    })
    socketRef.current = socket

    // 接続成功
    socket.on('connect', () => {
      console.log('[Socket] 接続成功:', socket.id)
      socket.emit('lobby:join') // ロビーに入室
    })

    // 接続エラー
    socket.on('connect_error', (error: Error) => {
      console.error('[Socket] 接続エラー:', error)
    })

    // 切断
    socket.on('disconnect', (reason: string) => {
      console.log('[Socket] 切断:', reason)
    })

    // ロビーイベント: 部屋一覧の初期データ
    socket.on('lobby:rooms', (rooms: GameRoom[]) => {
      console.log('[Socket] 部屋一覧受信:', rooms)
      setRooms(rooms)
    })
  
    // 部屋作成
    socket.on('room:created', (room: GameRoom) => {
      console.log('[Socket] 部屋作成:', room)
      upsertRoom(room)
    })

    // 部屋更新
    socket.on('room:updated', (room: GameRoom) => {
      console.log('[Socket] 部屋更新:', room)
      upsertRoom(room)
    })

    // 部屋削除
    socket.on('room:deleted', ({ roomId }: { roomId: string }) => {
      console.log('[Socket] 部屋削除:', roomId)
      removeRoom(roomId)
    })

    // エラー
    socket.on('room:error', ({ message }: { message: string }) => {
      console.error('[Socket] エラー:', message)
      alert(`エラー: ${message}`)
    })

    // 接続開始
    socket.connect()

    // クリーンアップ
    return () => {
      console.log('[Socket] クリーンアップ:', socket.id)
      socket.emit('lobby:leave')
      socket.disconnect()
    }
  }, [])
}

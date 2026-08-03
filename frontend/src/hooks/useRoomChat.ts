import { useCallback, useEffect, useRef, useState } from 'react'
import { Socket } from 'socket.io-client'
import type { ChatConnectionStatus, ChatMessage } from '../types/chat'
import { createSocket } from '../utils/socket'
import type {
  RoomClientToServerEvents,
  RoomServerToClientEvents,
} from '@ft_transcendence/shared/rooms-events.types'

export function useRoomChat(roomId: string, accessToken: string | null) {
  const socketRef = useRef<Socket<
    RoomServerToClientEvents,
    RoomClientToServerEvents
  > | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [connectionStatus, setConnectionStatus] =
    useState<ChatConnectionStatus>('connecting')
  const [error, setError] = useState<string | null>(null)
  const disabledMessage = 'ログインするとチャットを利用できます'

  const appendMessage = useCallback((message: ChatMessage) => {
    setMessages((currentMessages) => {
      if (currentMessages.some((current) => current.id === message.id)) {
        return currentMessages
      }
      return [...currentMessages, message]
    })
  }, [])

  useEffect(() => {
    if (!accessToken) {
      return
    }

    const socket = createSocket<
      RoomServerToClientEvents,
      RoomClientToServerEvents
    >('/rooms', accessToken, { autoConnect: false })
    socketRef.current = socket

    socket.on('connect', () => {
      setMessages([])
      setConnectionStatus('connected')
      setError(null)
      socket.emit('chat:join', { roomId })
    })

    socket.on('connect_error', () => {
      setConnectionStatus('disconnected')
      setError('チャットサーバーに接続できません')
    })

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected')
      setError('チャットの接続が切断されました')
    })

    socket.on(
      'chat:message',
      (payload: Parameters<RoomServerToClientEvents['chat:message']>[0]) => {
        if (payload.roomId !== roomId) return

        appendMessage({
          id: payload.id,
          roomId: payload.roomId,
          userId: payload.userId,
          username: payload.username,
          text: payload.text,
          createdAt: payload.createdAt,
        })
      }
    )

    socket.on(
      'chat:history',
      (payload: Parameters<RoomServerToClientEvents['chat:history']>[0]) => {
        if (payload.roomId !== roomId) return

        const history = payload.messages.map((m) => ({
          id: m.id,
          roomId: m.roomId,
          userId: m.userId,
          username: m.username,
          text: m.text,
          createdAt: m.createdAt,
        }))

        setMessages(history)
      }
    )

    socket.on(
      'chat:error',
      (payload: Parameters<RoomServerToClientEvents['chat:error']>[0]) => {
        setError(payload.message ?? 'メッセージを送信できません')
      }
    )

    socket.connect()

    return () => {
      socket.emit('chat:leave', { roomId })
      socket.off('connect')
      socket.off('connect_error')
      socket.off('disconnect')
      socket.off('chat:message')
      socket.off('chat:history')
      socket.off('chat:error')
      socket.disconnect()
      socketRef.current = null
    }
  }, [accessToken, appendMessage, roomId])

  const sendMessage = useCallback(
    (text: string) => {
      const socket = socketRef.current
      const trimmedText = text.trim()

      if (!trimmedText) return false

      if (!accessToken) {
        setConnectionStatus('disconnected')
        setError(disabledMessage)
        return false
      }

      if (!socket?.connected) {
        setConnectionStatus('disconnected')
        setError('接続が切断されています。再接続後に送信してください')
        return false
      }

      socket.emit('chat:message', { roomId, text: trimmedText }, (ack) => {
        if (ack?.ok === false) {
          setError(ack.error ?? 'メッセージを送信できません')
        }
      })

      setError(null)
      return true
    },
    [accessToken, disabledMessage, roomId]
  )

  return {
    messages: accessToken ? messages : [],
    connectionStatus: accessToken ? connectionStatus : 'disconnected',
    error: accessToken ? error : disabledMessage,
    sendMessage,
  }
}

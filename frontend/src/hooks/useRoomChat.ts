import { useCallback, useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import type { ChatConnectionStatus, ChatMessage } from '../types/chat'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || window.location.origin

type ChatAck = {
  ok?: boolean
  error?: string
}

interface SendChatMessagePayload {
  roomId: string
  text: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const getString = (
  value: Record<string, unknown>,
  key: string
): string | undefined => {
  const field = value[key]
  return typeof field === 'string' ? field : undefined
}

const createMessageId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const normalizeChatMessage = (
  payload: unknown,
  fallbackRoomId: string
): ChatMessage | null => {
  if (!isRecord(payload)) return null

  const nestedUser = isRecord(payload.user) ? payload.user : undefined
  const nestedSender = isRecord(payload.sender) ? payload.sender : undefined
  const text =
    getString(payload, 'text') ??
    getString(payload, 'message') ??
    getString(payload, 'content')

  if (!text?.trim()) return null

  const createdAt =
    getString(payload, 'createdAt') ??
    getString(payload, 'timestamp') ??
    new Date().toISOString()

  return {
    id: getString(payload, 'id') ?? createMessageId(),
    roomId: getString(payload, 'roomId') ?? fallbackRoomId,
    userId:
      getString(payload, 'userId') ??
      (nestedUser ? getString(nestedUser, 'id') : undefined) ??
      (nestedSender ? getString(nestedSender, 'id') : undefined),
    username:
      getString(payload, 'username') ??
      (nestedUser ? getString(nestedUser, 'username') : undefined) ??
      (nestedSender ? getString(nestedSender, 'username') : undefined) ??
      'Unknown',
    text: text.trim(),
    createdAt,
  }
}

export function useRoomChat(roomId: string, accessToken: string | null) {
  const socketRef = useRef<Socket | null>(null)
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

    const socket = io(BACKEND_URL, {
      autoConnect: false,
      auth: { token: accessToken },
    })
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

    socket.on('chat:message', (payload: unknown) => {
      const message = normalizeChatMessage(payload, roomId)
      if (!message || message.roomId !== roomId) return

      appendMessage(message)
    })

    socket.on('chat:history', (payload: unknown) => {
      if (!isRecord(payload)) return

      const historyRoomId = getString(payload, 'roomId')
      const historyMessages = payload.messages
      if (historyRoomId !== roomId || !Array.isArray(historyMessages)) return

      const history = historyMessages
        .map((item) => normalizeChatMessage(item, roomId))
        .filter(
          (message): message is ChatMessage =>
            message !== null && message.roomId === roomId
        )

      setMessages(history)
    })

    socket.on('chat:error', (payload: unknown) => {
      if (isRecord(payload)) {
        setError(getString(payload, 'message') ?? 'メッセージを送信できません')
        return
      }

      setError('メッセージを送信できません')
    })

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

      const message: SendChatMessagePayload = {
        roomId,
        text: trimmedText,
      }

      socket.emit('chat:message', message, (ack?: ChatAck) => {
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

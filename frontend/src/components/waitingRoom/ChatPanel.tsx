import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoomChat } from '../../hooks/useRoomChat'
import type { ChatUser } from '../../types/chat'

type ChatPanelProps = {
  roomId: string
  currentUser: ChatUser | null
  accessToken: string | null
}

const statusLabel = {
  connecting: '接続中',
  connected: '接続済み',
  disconnected: '切断中',
}

const statusClassName = {
  connecting: 'bg-amber-400',
  connected: 'bg-emerald-500',
  disconnected: 'bg-red-500',
}

const formatMessageTime = (createdAt: string) =>
  new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(createdAt))

const MAX_CHAT_MESSAGE_LENGTH = 200

export function ChatPanel({
  roomId,
  currentUser,
  accessToken,
}: ChatPanelProps) {
  const navigate = useNavigate()
  const [draft, setDraft] = useState('')
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const { messages, connectionStatus, error, sendMessage } = useRoomChat(
    roomId,
    accessToken
  )

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (sendMessage(draft)) {
      setDraft('')
    }
  }

  return (
    <aside className="flex h-[560px] min-h-[420px] flex-col overflow-hidden rounded-lg border border-gray-300 bg-white shadow">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">チャット</h2>
          <p className="text-xs text-gray-500">Room {roomId}</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
          <span
            className={`h-2.5 w-2.5 rounded-full ${statusClassName[connectionStatus]}`}
            aria-hidden="true"
          />
          {statusLabel[connectionStatus]}
        </div>
      </div>

      {error && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-gray-400">
            まだメッセージはありません
          </div>
        ) : (
          <ol className="space-y-3">
            {messages.map((message) => {
              const isOwnMessage = message.userId === currentUser?.id

              return (
                <li
                  key={message.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-lg px-3 py-2 ${
                      isOwnMessage
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2 text-xs">
                      {message.userId ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/profile/${message.userId}`)}
                          className={`font-semibold hover:underline ${
                            isOwnMessage ? 'text-blue-100' : 'text-blue-700'
                          }`}
                        >
                          {message.username}
                        </button>
                      ) : (
                        <span className="font-semibold text-gray-600">
                          {message.username}
                        </span>
                      )}
                      <span
                        className={
                          isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                        }
                      >
                        {formatMessageTime(message.createdAt)}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sm leading-5">
                      {message.text}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-gray-200 bg-gray-50 p-3"
      >
        <label htmlFor="chat-message" className="sr-only">
          メッセージ
        </label>
        <div className="flex gap-2">
          <input
            id="chat-message"
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="メッセージを入力"
            disabled={!accessToken}
            className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            maxLength={MAX_CHAT_MESSAGE_LENGTH}
          />
          <button
            type="submit"
            disabled={!accessToken || !draft.trim()}
            className="h-10 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            送信
          </button>
        </div>
      </form>
    </aside>
  )
}

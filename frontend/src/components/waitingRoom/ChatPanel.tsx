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
    <aside className="console-panel flex h-[560px] min-h-[420px] flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-emerald-300/20 px-4 py-3">
        <div>
          <h2 className="console-kicker text-base">CHAT CHANNEL</h2>
          <p className="text-xs text-emerald-100/50">Room {roomId}</p>
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
        <div className="border-b border-red-300/30 bg-red-300/10 px-4 py-2 text-sm text-red-100">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-emerald-100/40">
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
                        ? 'bg-[#1e7562] text-white'
                        : 'bg-[#153f37] text-emerald-50'
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2 text-xs">
                      {message.userId ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/profile/${message.userId}`)}
                          className={`font-semibold hover:underline ${
                            isOwnMessage ? 'text-emerald-100' : 'text-[#b8ff64]'
                          }`}
                        >
                          {message.username}
                        </button>
                      ) : (
                        <span className="font-semibold text-emerald-100/70">
                          {message.username}
                        </span>
                      )}
                      <span
                        className={
                          isOwnMessage
                            ? 'text-emerald-100/70'
                            : 'text-emerald-100/45'
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
        className="border-t border-emerald-300/20 bg-[#061d19] p-3"
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
            className="console-input min-w-0 flex-1 px-3 py-2 text-sm"
            maxLength={MAX_CHAT_MESSAGE_LENGTH}
          />
          <button
            type="submit"
            disabled={!accessToken || !draft.trim()}
            className="console-button h-10 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            送信
          </button>
        </div>
      </form>
    </aside>
  )
}

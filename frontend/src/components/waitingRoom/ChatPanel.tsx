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
  connecting: 'LINKING...',
  connected: 'ONLINE',
  disconnected: 'OFFLINE',
}

const statusClassName = {
  connecting:
    'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)] animate-pulse',
  connected: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]',
  disconnected: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]',
}

const formatMessageTime = (createdAt: string) =>
  new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
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
    <aside className="flex h-[560px] min-h-[420px] flex-col overflow-hidden rounded-2xl border border-cyan-500/30 bg-black/50 backdrop-blur-md shadow-[0_0_30px_rgba(0,255,255,0.05)]">
      {/* ヘッダー */}
      <div className="flex items-center justify-between border-b border-cyan-500/30 bg-cyan-950/20 px-5 py-4 relative">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-cyan-400 to-transparent opacity-50" />
        <div>
          <h2 className="text-lg font-bold tracking-widest text-cyan-100 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" /> COMMS LINK
          </h2>
          <p className="text-[10px] font-mono text-cyan-500/60 mt-0.5 tracking-[0.2em]">
            CH // {roomId.slice(0, 8)}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-cyan-300">
          <span
            className={`h-2 w-2 rounded-full ${statusClassName[connectionStatus]}`}
            aria-hidden="true"
          />
          {statusLabel[connectionStatus]}
        </div>
      </div>

      {error && (
        <div className="border-b border-red-500/40 bg-red-950/50 px-4 py-2 text-xs font-mono text-red-300 tracking-wider flex items-center gap-2">
          <span className="text-red-500">⚠</span> {error}
        </div>
      )}

      {/* メッセージログ */}
      <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-thin scrollbar-thumb-cyan-700/50 scrollbar-track-transparent">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-xs font-mono tracking-[0.2em] text-cyan-600/40">
            NO INCOMING TRANSMISSIONS
          </div>
        ) : (
          <ol className="space-y-4">
            {messages.map((message) => {
              const isOwnMessage = message.userId === currentUser?.id

              return (
                <li
                  key={message.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-4 py-2 border backdrop-blur-sm ${
                      isOwnMessage
                        ? 'bg-cyan-800/40 border-cyan-400/50 text-cyan-50 rounded-tr-sm shadow-[0_0_10px_rgba(0,255,255,0.1)]'
                        : 'bg-black/60 border-cyan-900/70 text-cyan-100 rounded-tl-sm'
                    }`}
                  >
                    <div className="mb-1.5 flex items-center gap-3 text-[10px] font-mono">
                      {message.userId ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/profile/${message.userId}`)}
                          className={`font-bold tracking-wider hover:text-white transition-colors ${
                            isOwnMessage ? 'text-cyan-300' : 'text-cyan-500'
                          }`}
                        >
                          {isOwnMessage ? 'YOU' : message.username}
                        </button>
                      ) : (
                        <span className="font-bold tracking-wider text-gray-500">
                          {message.username}
                        </span>
                      )}
                      <span
                        className={
                          isOwnMessage ? 'text-cyan-200/50' : 'text-cyan-700/50'
                        }
                      >
                        {formatMessageTime(message.createdAt)}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed font-sans">
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

      {/* 入力フォーム */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-cyan-500/30 bg-black/60 p-4"
      >
        <label htmlFor="chat-message" className="sr-only">
          メッセージ
        </label>
        <div className="flex gap-2 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600 font-mono text-sm">
            &gt;
          </span>
          <input
            id="chat-message"
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={accessToken ? 'TRANSMIT MESSAGE...' : 'LOGIN REQUIRED'}
            disabled={!accessToken}
            className="min-w-0 flex-1 rounded-md border border-cyan-800 bg-cyan-950/20 pl-8 pr-3 py-2.5 text-sm text-cyan-100 font-mono placeholder-cyan-800/80 outline-none transition focus:border-cyan-400 focus:bg-cyan-950/40 focus:ring-1 focus:ring-cyan-400 disabled:opacity-50"
            maxLength={MAX_CHAT_MESSAGE_LENGTH}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!accessToken || !draft.trim()}
            className="rounded-md border border-cyan-500 bg-cyan-700/40 px-5 text-xs font-bold tracking-widest text-cyan-100 transition-all hover:bg-cyan-600/60 hover:shadow-[0_0_10px_rgba(0,255,255,0.3)] disabled:cursor-not-allowed disabled:border-gray-700 disabled:bg-gray-800/40 disabled:text-gray-600"
          >
            SEND
          </button>
        </div>
      </form>
    </aside>
  )
}

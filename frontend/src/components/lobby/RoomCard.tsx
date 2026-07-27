import type { GameRoom } from '../../types/room'

interface Props {
  room: GameRoom
  onJoin: (roomId: string) => void
}

export function RoomCard({ room, onJoin }: Props) {
  const isFull = room.players.length >= room.maxPlayers

  return (
    <div className="group relative rounded-xl border border-cyan-900/50 bg-cyan-950/20 p-4 backdrop-blur-sm transition-all hover:border-cyan-500/50 hover:bg-cyan-900/30">
      {/* ヘッダー: 部屋名 + ステータス */}
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-cyan-900/40 pb-2">
        <h3 className="truncate text-sm font-bold tracking-wider text-cyan-50">
          {room.name}
        </h3>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-900/30 px-2 py-0.5 text-[10px] font-bold tracking-widest text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          WAITING
        </span>
      </div>

      {/* ホスト */}
      <p className="mb-3 text-[10px] font-mono tracking-widest text-cyan-500">
        HOST // <span className="text-cyan-200">{room.hostName}</span>
      </p>

      {/* プレイヤースロット */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex gap-1">
          {Array.from({ length: room.maxPlayers }).map((_, i) => (
            <div
              key={i}
              className={`h-2.5 w-6 rounded-sm ${
                i < room.players.length
                  ? 'bg-cyan-400 shadow-[0_0_6px_rgba(0,255,255,0.6)]'
                  : 'bg-cyan-900/40'
              }`}
            />
          ))}
        </div>
        <span className="text-xs font-mono text-cyan-400">
          {room.players.length}/{room.maxPlayers}
        </span>
      </div>

      {/* 参加ボタン */}
      <button
        onClick={() => onJoin(room.id)}
        disabled={isFull}
        className={`w-full rounded-lg border py-2 text-xs font-bold tracking-widest transition-all ${
          isFull
            ? 'cursor-not-allowed border-cyan-900/50 bg-black/40 text-cyan-700/50'
            : 'border-cyan-400/60 bg-cyan-700/30 text-cyan-100 hover:border-cyan-300 hover:bg-cyan-600/50 hover:shadow-[0_0_15px_rgba(0,255,255,0.3)]'
        }`}
      >
        {isFull ? 'FULL' : 'JOIN'}
      </button>
    </div>
  )
}

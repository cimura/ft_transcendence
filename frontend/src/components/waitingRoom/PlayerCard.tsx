import type { RoomPlayer } from '@ft_transcendence/shared/rooms-events.types'
import { Avatar } from '../common/Avatar'

interface Props {
  player: RoomPlayer
}

export function PlayerCard({ player }: Props) {
  return (
    <div
      className={`group flex items-center justify-between rounded-xl border p-4 transition-all duration-300 backdrop-blur-sm ${
        player.isReady
          ? 'bg-cyan-900/20 border-cyan-400/50 shadow-[inset_0_0_15px_rgba(0,255,255,0.05)]'
          : 'bg-black/40 border-cyan-800/50 hover:border-cyan-500/50 hover:bg-cyan-950/30'
      }`}
    >
      {/* 左側: アバター + 名前 */}
      <div className="flex items-center gap-4">
        {/* アバター */}
        <div className="relative">
          <Avatar
            avatarUrl={player.avatarUrl}
            username={player.username}
            className={`h-12 w-12 rounded-full border-2 shadow-[0_0_10px_rgba(0,255,255,0.2)] ${
              player.isReady ? 'border-cyan-300' : 'border-cyan-700'
            }`}
            fallbackClassName={`font-bold text-lg ${
              player.isReady
                ? 'bg-cyan-700/80 text-white'
                : 'bg-cyan-950 text-cyan-300'
            }`}
          />
          {/* 装飾のリング */}
          {player.isReady && (
            <div className="absolute -inset-1 rounded-full border border-cyan-400/30 animate-[spin_4s_linear_infinite]" />
          )}
        </div>

        {/* 名前 + ホストバッジ */}
        <div>
          <div className="flex items-center gap-3">
            <span className="font-bold tracking-wider text-cyan-50">
              {player.username}
            </span>
            {player.isHost && (
              <span className="rounded bg-yellow-900/60 border border-yellow-500/50 px-2 py-0.5 text-[10px] tracking-widest font-bold text-yellow-300 shadow-[0_0_8px_rgba(234,179,8,0.2)]">
                HOST
              </span>
            )}
          </div>
          <p className="text-[9px] font-mono text-cyan-500/50 tracking-[0.2em] mt-0.5">
            ID // {player.userId.slice(0, 8)}
          </p>
        </div>
      </div>

      {/* 右側: Ready状態 */}
      <div>
        {player.isReady ? (
          <span className="rounded-full bg-emerald-900/60 border border-emerald-400 px-4 py-1.5 text-xs font-bold tracking-widest text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
            READY
          </span>
        ) : (
          <span className="rounded-full bg-red-950/40 border border-red-500/40 px-4 py-1.5 text-xs font-bold tracking-widest text-red-400/80 animate-pulse">
            STANDBY
          </span>
        )}
      </div>
    </div>
  )
}

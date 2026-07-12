import type { RoomPlayer } from '../../types'

interface Props {
  player: RoomPlayer
}

export function PlayerCard({ player }: Props) {
  return (
    <div className="console-panel console-panel--subtle flex items-center justify-between p-4">
      {/* 左側: アバター + 名前 */}
      <div className="flex items-center gap-3">
        {/* アバター */}
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1e7562] font-bold text-white">
          {player.username.charAt(0).toUpperCase()}
        </div>

        {/* 名前 + ホストバッジ */}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">{player.username}</span>
            {player.isHost && (
              <span className="border border-[#b8ff64]/50 bg-[#b8ff64]/10 px-2 py-0.5 text-xs font-semibold text-[#b8ff64]">
                Host
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 右側: Ready状態 */}
      <div>
        {player.isReady ? (
          <span className="border border-[#b8ff64]/50 bg-[#b8ff64]/10 px-3 py-1 text-sm font-semibold text-[#b8ff64]">
            Ready
          </span>
        ) : (
          <span className="border border-white/10 bg-white/5 px-3 py-1 text-sm font-semibold text-emerald-100/50">
            Not Ready
          </span>
        )}
      </div>
    </div>
  )
}

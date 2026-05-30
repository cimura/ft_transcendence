import type { RoomPlayer } from '../../types'

interface Props {
  player: RoomPlayer
}

export function PlayerCard({ player }: Props) {
  return (
    <div
      className="flex items-center justify-between rounded-lg border border-gray-300 bg-white 
  p-4"
    >
      {/* 左側: アバター + 名前 */}
      <div className="flex items-center gap-3">
        {/* アバター */}
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 
  text-white font-bold"
        >
          {player.username.charAt(0).toUpperCase()}
        </div>

        {/* 名前 + ホストバッジ */}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">
              {player.username}
            </span>
            {player.isHost && (
              <span
                className="rounded bg-yellow-500 px-2 py-0.5 text-xs font-semibold 
  text-white"
              >
                Host
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 右側: Ready状態 */}
      <div>
        {player.isReady ? (
          <span className="rounded-full bg-green-500 px-3 py-1 text-sm font-semibold text-white">
            Ready
          </span>
        ) : (
          <span
            className="rounded-full bg-gray-300 px-3 py-1 text-sm font-semibold 
  text-gray-600"
          >
            Not Ready
          </span>
        )}
      </div>
    </div>
  )
}

import { Html } from '@react-three/drei'
import { SCENE_CONFIG } from './constants/scene-constants'
import { useGameStore } from '../../stores/gameStore'

type PlayerNameLabelProps = {
  playerId: string
  username: string
  position: [number, number, number]
}

export function PlayerNameLabel({
  playerId,
  username,
  position,
}: PlayerNameLabelProps) {
  const myPlayerId = useGameStore((state) => state.myPlayerId)
  const isMe = playerId === myPlayerId

  return (
    <group position={position}>
      <Html
        center
        zIndexRange={SCENE_CONFIG.playerLabel.zIndexRange}
        style={{ pointerEvents: 'none' }}
      >
        <div className="flex flex-col items-center">
          <span
            className={
              isMe
                ? 'max-w-[7rem] truncate whitespace-nowrap font-sans text-[12px] font-bold tracking-widest text-cyan-50/90 drop-shadow-[0_0_10px_rgba(0,255,255,0.85)] select-none'
                : 'max-w-[7rem] truncate whitespace-nowrap font-sans text-[11px] font-bold tracking-widest text-white/55 drop-shadow-[0_0_6px_rgba(0,255,255,0.45)] select-none'
            }
          >
            {username}
          </span>
          {isMe && (
            <span className="font-mono text-[8px] tracking-[0.3em] text-cyan-300/80 select-none">
              YOU
            </span>
          )}
        </div>
      </Html>
    </group>
  )
}

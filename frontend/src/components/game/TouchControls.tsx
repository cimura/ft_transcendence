import type { BombermanInput, ActiveControl } from '../../types/game'
import type { Direction } from '@ft_transcendence/shared/game-events.types'

type TouchControlsProps = {
  onInput: (input: BombermanInput) => void
  activeControl: ActiveControl
}

const directions: {
  label: string
  direction: Direction
  className: string
  icon: React.ReactNode
}[] = [
  {
    label: '上',
    direction: 'up',
    className: 'col-start-2 row-start-1',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
        <path d="M12 20V4" />
        <path d="m5 11 7-7 7 7" />
      </svg>
    ),
  },
  {
    label: '左',
    direction: 'left',
    className: 'col-start-1 row-start-2',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
        <path d="M20 12H4" />
        <path d="m11 19-7-7 7-7" />
      </svg>
    ),
  },
  {
    label: '下',
    direction: 'down',
    className: 'col-start-2 row-start-2',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
        <path d="M12 4v16" />
        <path d="m19 13-7 7-7-7" />
      </svg>
    ),
  },
  {
    label: '右',
    direction: 'right',
    className: 'col-start-3 row-start-2',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
        <path d="M4 12h16" />
        <path d="m13 5 7 7-7 7" />
      </svg>
    ),
  },
]

// パネルの背景透過度を少し下げて、後ろのゲーム画面を見やすく調整
const panelStyles =
  'relative flex flex-col items-center justify-center gap-4 p-5 bg-black/40 backdrop-blur-md rounded-[1.5rem] border border-cyan-500/30 shadow-[0_0_30px_rgba(0,255,255,0.1)] w-max mx-auto select-none touch-none'

const directionButtonStyles = {
  base: 'w-[4.5rem] h-[4.5rem] touch-none rounded-2xl flex items-center justify-center transition-all duration-100 border-[3px]',
  idle: 'border-cyan-400/60 text-cyan-300 bg-cyan-950/40 shadow-[0_0_15px_rgba(0,255,255,0.2),inset_0_0_10px_rgba(0,255,255,0.1)] hover:bg-cyan-900/60',
  active: 'border-cyan-200 text-white bg-cyan-400/50 shadow-[0_0_25px_rgba(0,255,255,0.6),inset_0_0_20px_rgba(0,255,255,0.4)] scale-95',
  inactive: 'border-cyan-900/40 text-cyan-800 bg-transparent',
}

const bombButtonStyles = {
  base: 'w-full h-[4.5rem] touch-none rounded-2xl flex items-center justify-center transition-all duration-100 border-[3px]',
  idle: 'border-red-500/60 text-red-400 bg-red-950/40 shadow-[0_0_15px_rgba(255,0,0,0.2),inset_0_0_10px_rgba(255,0,0,0.1)] hover:bg-red-900/60',
  active: 'border-red-300 text-white bg-red-500/50 shadow-[0_0_25px_rgba(255,0,0,0.6),inset_0_0_20px_rgba(255,0,0,0.4)] scale-95',
  inactive: 'border-red-900/40 text-red-800 bg-transparent',
}

export function TouchControls({ onInput, activeControl }: TouchControlsProps) {
  const handlePointerDown = (direction: Direction) => {
    onInput({ type: 'move', direction })
  }

  const handlePointerUp = () => {
    onInput({ type: 'stop' })
  }

  const getDirectionClassName = (direction: Direction) => {
    if (!activeControl) return directionButtonStyles.idle
    if (activeControl === direction) {
      return directionButtonStyles.active
    }
    return directionButtonStyles.inactive
  }

  const getBombClassName = () => {
    if (!activeControl) return bombButtonStyles.idle
    if (activeControl === 'bomb') {
      return bombButtonStyles.active
    }
    return bombButtonStyles.inactive
  }

  return (
    <div className={panelStyles}>
      {/* HUD風の四隅のアクセント装飾 */}
      <div className="absolute top-2 left-2 w-3 h-3 border-t-[3px] border-l-[3px] border-cyan-400 opacity-80 rounded-tl-sm pointer-events-none" />
      <div className="absolute top-2 right-2 w-3 h-3 border-t-[3px] border-r-[3px] border-cyan-400 opacity-80 rounded-tr-sm pointer-events-none" />
      <div className="absolute bottom-2 left-2 w-3 h-3 border-b-[3px] border-l-[3px] border-cyan-400 opacity-80 rounded-bl-sm pointer-events-none" />
      <div className="absolute bottom-2 right-2 w-3 h-3 border-b-[3px] border-r-[3px] border-cyan-400 opacity-80 rounded-br-sm pointer-events-none" />

      {/* 十字キーエリア */}
      <div className="grid grid-cols-3 grid-rows-2 gap-2 relative z-10">
        {directions.map(({ label, direction, className, icon }) => (
          <button
            key={direction}
            type="button"
            aria-label={label}
            className={`${directionButtonStyles.base} ${getDirectionClassName(direction)} ${className}`}
            onPointerDown={(event) => {
              event.preventDefault()
              handlePointerDown(direction)
            }}
            onPointerLeave={(event) => {
              event.preventDefault()
              handlePointerUp()
            }}
            onPointerUp={(event) => {
              event.preventDefault()
              handlePointerUp()
            }}
          >
            {icon}
          </button>
        ))}
      </div>
      
      {/* 爆弾ボタンエリア */}
      <button
        type="button"
        aria-label="爆弾"
        className={`${bombButtonStyles.base} ${getBombClassName()} relative z-10 mt-1`}
        onPointerDown={(event) => {
          event.preventDefault()
          onInput({ type: 'place_bomb' })
        }}
        onPointerLeave={(event) => {
          event.preventDefault()
        }}
        onPointerUp={(event) => {
          event.preventDefault()
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
          <circle cx="11" cy="14" r="6" />
          <path d="M15 10c1.5-1.5 2.5-1.5 4-2" />
          <path d="M21 7.5a1.5 1.5 0 0 0-3 0" />
          <path d="M19 6v3" />
          <path d="M17.5 7.5h3" />
        </svg>
      </button>
    </div>
  )
}
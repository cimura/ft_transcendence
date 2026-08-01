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
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-6 h-6"
      >
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
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-6 h-6"
      >
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
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-6 h-6"
      >
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
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-6 h-6"
      >
        <path d="M4 12h16" />
        <path d="m13 5 7 7-7 7" />
      </svg>
    ),
  },
]

// パネル自体をダークメタルのプレート風に変更し、余白(p-3)や隙間(gap-2)を詰めて小さくしました
const panelStyles =
  'relative flex flex-col items-center justify-center gap-2 p-3 bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 rounded-2xl border-2 border-gray-600 shadow-[0_8px_20px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.2)] w-max mx-auto select-none touch-none'

// w-12 h-12 に縮小（以前は 4.5rem = 72px だったものを 48px に）
// 金属の質感を出すためのグラデーションとシャドウを設定
const directionButtonStyles = {
  base: 'w-12 h-12 touch-none rounded-xl flex items-center justify-center transition-all duration-100 border-[2px]',
  idle: 'border-gray-500 text-gray-200 bg-gradient-to-b from-gray-500 to-gray-700 shadow-[0_4px_6px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.3)] hover:from-gray-400 hover:to-gray-600',
  // 押した時は凹んで少し光る演出
  active:
    'border-cyan-500/80 text-cyan-300 bg-gray-800 shadow-[inset_0_4px_8px_rgba(0,0,0,0.6),0_0_10px_rgba(0,255,255,0.2)] scale-95 translate-y-[2px]',
  inactive: 'border-gray-700 text-gray-500 bg-gray-800/80 shadow-none',
}

const bombButtonStyles = {
  base: 'w-full h-12 touch-none rounded-xl flex items-center justify-center transition-all duration-100 border-[2px]',
  idle: 'border-gray-500 text-red-400 bg-gradient-to-b from-gray-500 to-gray-700 shadow-[0_4px_6px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.3)] hover:from-gray-400 hover:to-gray-600',
  // 爆弾ボタンは押すと赤く光って凹む
  active:
    'border-red-500/80 text-red-400 bg-gray-800 shadow-[inset_0_4px_8px_rgba(0,0,0,0.6),0_0_10px_rgba(255,0,0,0.2)] scale-95 translate-y-[2px]',
  inactive: 'border-gray-700 text-gray-500 bg-gray-800/80 shadow-none',
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
      {/* メタルプレートの四隅のネジ（リベット）風の装飾 */}
      <div className="absolute top-2 left-2 w-1.5 h-1.5 bg-gray-400 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.6),0_1px_0_rgba(255,255,255,0.2)] pointer-events-none" />
      <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-gray-400 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.6),0_1px_0_rgba(255,255,255,0.2)] pointer-events-none" />
      <div className="absolute bottom-2 left-2 w-1.5 h-1.5 bg-gray-400 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.6),0_1px_0_rgba(255,255,255,0.2)] pointer-events-none" />
      <div className="absolute bottom-2 right-2 w-1.5 h-1.5 bg-gray-400 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.6),0_1px_0_rgba(255,255,255,0.2)] pointer-events-none" />

      {/* 十字キーエリア */}
      <div className="grid grid-cols-3 grid-rows-2 gap-1 relative z-10 px-1">
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
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-7 h-7"
        >
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

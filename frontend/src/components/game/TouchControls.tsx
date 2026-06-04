import type { BombermanInput, Direction } from '../../game/bomberman/bombermanTypes'

export type ActiveControl = Direction | 'bomb' | null

type TouchControlsProps = {
  onInput: (input: BombermanInput) => void
  activeControl: ActiveControl
}

const directions: { label: string; direction: Direction; className: string }[] = [
  { label: '上', direction: 'up', className: 'col-start-2 row-start-1' },
  { label: '左', direction: 'left', className: 'col-start-1 row-start-2' },
  { label: '下', direction: 'down', className: 'col-start-2 row-start-2' },
  { label: '右', direction: 'right', className: 'col-start-3 row-start-2' },
]

const panelStyles =
  'flex touch-none select-none flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm'

const directionButtonStyles = {
  base: 'h-12 touch-none rounded-md text-sm font-semibold transition-colors',
  idle: 'bg-gray-800 text-white active:bg-gray-600',
  active: 'bg-yellow-300 text-gray-950 shadow-lg ring-2 ring-yellow-500',
  inactive: 'bg-gray-300 text-gray-500 opacity-45',
}

const bombButtonStyles = {
  base: 'h-12 touch-none rounded-md font-semibold transition-colors',
  idle: 'bg-red-600 text-white active:bg-red-500',
  active: directionButtonStyles.active,
  inactive: 'bg-red-200 text-red-500 opacity-45',
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
      <div className="grid grid-cols-3 grid-rows-2 gap-2">
        {directions.map(({ label, direction, className }) => (
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
            {label}
          </button>
        ))}
      </div>
      <button
        type="button"
        className={`${bombButtonStyles.base} ${getBombClassName()}`}
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
        爆弾
      </button>
    </div>
  )
}

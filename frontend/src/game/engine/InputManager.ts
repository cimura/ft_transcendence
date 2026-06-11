import type { BombermanInput, Direction } from '../bomberman/bombermanTypes'

type InputListener = (input: BombermanInput) => void

const directionKeys: Record<string, Direction> = {
  ArrowUp: 'up',
  w: 'up',
  W: 'up',
  ArrowDown: 'down',
  s: 'down',
  S: 'down',
  ArrowLeft: 'left',
  a: 'left',
  A: 'left',
  ArrowRight: 'right',
  d: 'right',
  D: 'right',
}

export class InputManager {
  private readonly listener: InputListener
  private activeDirection: Direction | null = null

  constructor(listener: InputListener) {
    this.listener = listener
  }

  attach() {
    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', this.handleKeyUp)
  }

  detach() {
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('keyup', this.handleKeyUp)
  }

  emitTouchInput(input: BombermanInput) {
    this.listener(input)
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.repeat) return

    const direction = directionKeys[event.key]
    if (direction) {
      event.preventDefault()
      this.activeDirection = direction
      this.listener({ type: 'move', direction })
      return
    }

    if (event.key === ' ') {
      event.preventDefault()
      this.listener({ type: 'place_bomb' })
    }
  }

  private handleKeyUp = (event: KeyboardEvent) => {
    const direction = directionKeys[event.key]
    if (!direction || direction !== this.activeDirection) return

    event.preventDefault()
    this.activeDirection = null
    this.listener({ type: 'stop' })
  }
}

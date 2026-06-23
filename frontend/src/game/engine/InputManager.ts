import type { BombermanInput, Direction } from '../bomberman/bombermanTypes'

export class InputManager {
  private onInput: (input: BombermanInput) => void
  private activeDirections: Direction[] = []
  private attached = false

  constructor(onInput: (input: BombermanInput) => void) {
    this.onInput = onInput
    this.handleKeyDown = this.handleKeyDown.bind(this)
    this.handleKeyUp = this.handleKeyUp.bind(this)
  }

  attach() {
    if (this.attached) return
    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', this.handleKeyUp)
    this.attached = true
  }

  detach() {
    if (!this.attached) return
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('keyup', this.handleKeyUp)
    this.attached = false
    this.activeDirections = []
  }

  // タッチコントローラー（画面上のボタン）からの直接入力用
  emitTouchInput(input: BombermanInput) {
    // タッチ入力とキーボード入力が競合しないよう、キーボードのスタックはクリアする
    if (input.type === 'move' || input.type === 'stop') {
      this.activeDirections = []
    }
    this.onInput(input)
  }

  private handleKeyDown(e: KeyboardEvent) {
    // キー押しっぱなしによるOSの連続入力（リピート）は無視する
    if (e.repeat) return

    const dir = this.getDirectionFromKey(e.code)
    if (dir) {
      if (!this.activeDirections.includes(dir)) {
        this.activeDirections.push(dir) // スタックの末尾に追加
        this.emitCurrentDirection()
      }
      return
    }

    if (e.code === 'Space' || e.code === 'Enter') {
      this.onInput({ type: 'place_bomb' })
    }
  }

  private handleKeyUp(e: KeyboardEvent) {
    const dir = this.getDirectionFromKey(e.code)
    if (dir) {
      const index = this.activeDirections.indexOf(dir)
      if (index > -1) {
        this.activeDirections.splice(index, 1) // 離したキーをスタックから削除
        this.emitCurrentDirection()
      }
    }
  }

  private emitCurrentDirection() {
    if (this.activeDirections.length > 0) {
      // 常にスタックの末尾（最後に押されたキー）を現在の進行方向とする
      const currentDir = this.activeDirections[this.activeDirections.length - 1]
      this.onInput({ type: 'move', direction: currentDir })
    } else {
      // スタックが空になれば停止
      this.onInput({ type: 'stop' })
    }
  }

  private getDirectionFromKey(code: string): Direction | null {
    switch (code) {
      case 'KeyW':
      case 'ArrowUp':
        return 'up'
      case 'KeyS':
      case 'ArrowDown':
        return 'down'
      case 'KeyA':
      case 'ArrowLeft':
        return 'left'
      case 'KeyD':
      case 'ArrowRight':
        return 'right'
      default:
        return null
    }
  }
}

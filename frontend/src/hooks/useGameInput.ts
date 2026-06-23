import { useCallback, useRef, useState, MutableRefObject } from 'react'
import { Socket } from 'socket.io-client'
import { useInputManager } from './useInputManager'
import type {
  BombermanInput,
  Direction,
} from '../game/bomberman/bombermanTypes'
import type { ActiveControl } from '../components/game/TouchControls'

const BOMB_HIGHLIGHT_DURATION_MS = 180

export function useGameInput(
  socketRef: MutableRefObject<Socket | null>,
  onInput?: (input: BombermanInput) => void
) {
  const bombHighlightTimeoutRef = useRef<number | null>(null)
  const seqRef = useRef<number>(0)

  const [activeControl, setActiveControl] = useState<ActiveControl>(null)

  const isDirection = (value: ActiveControl): value is Direction =>
    value === 'up' || value === 'down' || value === 'left' || value === 'right'

  const clearBombHighlightTimeout = useCallback(() => {
    if (bombHighlightTimeoutRef.current === null) return
    window.clearTimeout(bombHighlightTimeoutRef.current)
    bombHighlightTimeoutRef.current = null
  }, [])

  const highlightBomb = useCallback(() => {
    clearBombHighlightTimeout()
    setActiveControl('bomb')
    bombHighlightTimeoutRef.current = window.setTimeout(() => {
      setActiveControl(null)
      bombHighlightTimeoutRef.current = null
    }, BOMB_HIGHLIGHT_DURATION_MS)
  }, [clearBombHighlightTimeout])

  const handleInputState = useCallback(
    (input: BombermanInput) => {
      if (input.type === 'move') {
        clearBombHighlightTimeout()
        setActiveControl(input.direction)
        return
      }
      if (input.type === 'place_bomb') {
        highlightBomb()
        return
      }
      setActiveControl((current) => (isDirection(current) ? null : current))
    },
    [clearBombHighlightTimeout, highlightBomb]
  )

  // 入力イベントが発生した際の統合処理
  const handleCombinedInput = useCallback(
    (input: BombermanInput) => {
      handleInputState(input)

      // サーバーへの送信（インフラレイヤー）
      if (socketRef.current) {
        seqRef.current += 1
        const clientTime = performance.now()

        if (input.type === 'move') {
          socketRef.current.emit('player:input', {
            direction: input.direction,
            seq: seqRef.current,
            clientTime,
          })
        } else if (input.type === 'stop') {
          socketRef.current.emit('player:input', {
            direction: null,
            seq: seqRef.current,
            clientTime,
          })
        } else if (input.type === 'place_bomb') {
          socketRef.current.emit('bomb:place', {
            seq: seqRef.current,
            clientTime,
          })
        }
      }

      onInput?.(input)
    },
    [handleInputState, socketRef, onInput]
  )

  // 新しく作成したReact Hooksを呼び出す
  const { emitTouchInput } = useInputManager(handleCombinedInput)

  return {
    activeControl,
    handleTouchInput: emitTouchInput,
  }
}

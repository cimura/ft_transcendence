import { useCallback, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import { Socket } from 'socket.io-client'
import { useInputManager } from './useInputManager'
import { useGameStore } from '../stores/gameStore'
import type { BombermanInput, ActiveControl } from '../types/game'
import type { Direction } from '@ft_transcendence/shared/game-events.types'

const BOMB_HIGHLIGHT_DURATION_MS = 180

export function useGameInput(socketRef: MutableRefObject<Socket | null>) {
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

  const handleCombinedInput = useCallback(
    (input: BombermanInput) => {
      const phase = useGameStore.getState().gamePhase
      if (phase !== 'playing') {
        return
      }

      handleInputState(input)

      if (socketRef.current) {
        seqRef.current += 1

        if (input.type === 'move') {
          socketRef.current.emit('player:input', {
            direction: input.direction,
            seq: seqRef.current,
          })
        } else if (input.type === 'stop') {
          socketRef.current.emit('player:input', {
            direction: null,
            seq: seqRef.current,
          })
        } else if (input.type === 'place_bomb') {
          socketRef.current.emit('bomb:place', {
            seq: seqRef.current,
          })
        }
      }
    },
    [handleInputState, socketRef]
  )

  const { emitTouchInput } = useInputManager(handleCombinedInput)

  return {
    activeControl,
    handleTouchInput: emitTouchInput,
  }
}

import { useEffect, useRef, useCallback } from 'react'
import type { BombermanInput } from '../types/game'
import type { Direction } from '@ft_transcendence/shared/game-events.types'

export function useInputManager(onInput: (input: BombermanInput) => void) {
  const activeKeys = useRef<string[]>([])

  const onInputRef = useRef(onInput)
  useEffect(() => {
    onInputRef.current = onInput
  }, [onInput])

  const getDirectionFromKey = useCallback((code: string): Direction | null => {
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
  }, [])

  const emitCurrentDirection = useCallback(() => {
    if (activeKeys.current.length > 0) {
      // 常にスタックの末尾（最後に押されたキー）を基準に方向を決定する
      const lastKey = activeKeys.current[activeKeys.current.length - 1]
      const currentDir = getDirectionFromKey(lastKey)

      if (currentDir) {
        onInputRef.current({ type: 'move', direction: currentDir })
      }
    } else {
      onInputRef.current({ type: 'stop' })
    }
  }, [getDirectionFromKey])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const dir = getDirectionFromKey(e.code)
      if (dir) {
        e.preventDefault() // 画面スクロールを防ぐ
        // OSのキーリピートによる連続入力は無視する
        if (e.repeat) return

        if (!activeKeys.current.includes(e.code)) {
          activeKeys.current.push(e.code)
          emitCurrentDirection()
        }
        return
      }

      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        if (e.repeat) return

        onInputRef.current({ type: 'place_bomb' })
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const dir = getDirectionFromKey(e.code)
      if (dir) {
        const index = activeKeys.current.indexOf(e.code)
        if (index > -1) {
          activeKeys.current.splice(index, 1)
          emitCurrentDirection()
        }
      }
    }

    const handleBlur = () => {
      activeKeys.current = []
      emitCurrentDirection()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
      activeKeys.current = []
    }
  }, [emitCurrentDirection, getDirectionFromKey])

  // タッチコントローラーからの直接入力用
  const emitTouchInput = useCallback((input: BombermanInput) => {
    if (input.type === 'move' || input.type === 'stop') {
      activeKeys.current = []
    }
    onInputRef.current(input)
  }, [])

  return { emitTouchInput }
}

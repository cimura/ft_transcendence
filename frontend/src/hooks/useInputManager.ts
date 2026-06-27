import { useEffect, useRef, useCallback } from 'react'
import type { BombermanInput } from '../types/game'
import type { Direction } from '@ft_transcendence/shared/game-events.types'

export function useInputManager(onInput: (input: BombermanInput) => void) {
  const activeDirections = useRef<Direction[]>([])

  const onInputRef = useRef(onInput)
  useEffect(() => {
    onInputRef.current = onInput
  }, [onInput])

  const emitCurrentDirection = useCallback(() => {
    if (activeDirections.current.length > 0) {
      // 常にスタックの末尾（最後に押されたキー）を現在の進行方向とする
      const currentDir =
        activeDirections.current[activeDirections.current.length - 1]
      onInputRef.current({ type: 'move', direction: currentDir })
    } else {
      onInputRef.current({ type: 'stop' })
    }
  }, [])

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const dir = getDirectionFromKey(e.code)
      if (dir) {
        e.preventDefault() // 画面スクロールを防ぐ
        // OSのキーリピートによる連続入力は無視する
        if (e.repeat) return

        if (!activeDirections.current.includes(dir)) {
          activeDirections.current.push(dir)
          emitCurrentDirection()
        }
        return
      }

      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        // OSのキーリピートによる連続入力は無視する
        if (e.repeat) return

        onInputRef.current({ type: 'place_bomb' })
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const dir = getDirectionFromKey(e.code)
      if (dir) {
        const index = activeDirections.current.indexOf(dir)
        if (index > -1) {
          activeDirections.current.splice(index, 1) // 離したキーをスタックから削除
          emitCurrentDirection()
        }
      }
    }

    const handleBlur = () => {
      activeDirections.current = []
      emitCurrentDirection()
    }

    // イベントリスナーの登録とクリーンアップ（Reactのライフサイクルと同期）
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
      activeDirections.current = []
    }
  }, [emitCurrentDirection, getDirectionFromKey])

  // タッチコントローラーからの直接入力用
  const emitTouchInput = useCallback((input: BombermanInput) => {
    if (input.type === 'move' || input.type === 'stop') {
      activeDirections.current = []
    }
    onInputRef.current(input)
  }, [])

  return { emitTouchInput }
}

import { useEffect, useRef, useCallback } from 'react'
import type {
  BombermanInput,
  Direction,
} from '../game/bomberman/bombermanTypes'

export function useInputManager(onInput: (input: BombermanInput) => void) {
  // 押下中のキー（進行方向）のスタック。再描画を防ぐため useRef で管理
  const activeDirections = useRef<Direction[]>([])

  // コールバックが更新されてもイベントリスナーを再登録しなくて済むよう useRef に保持
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
      // OSのキーリピートによる連続入力は無視する
      if (e.repeat) return

      const dir = getDirectionFromKey(e.code)
      if (dir) {
        if (!activeDirections.current.includes(dir)) {
          activeDirections.current.push(dir)
          emitCurrentDirection()
        }
        return
      }

      if (e.code === 'Space' || e.code === 'Enter') {
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

    // イベントリスナーの登録とクリーンアップ（Reactのライフサイクルと同期）
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
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

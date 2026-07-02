import { useEffect } from 'react'
import { useGameStore } from '../stores/gameStore'

export function useGamePhaseTransition() {
  const countdown = useGameStore((state) => state.countdown)
  const gamePhase = useGameStore((state) => state.gamePhase)
  const setGamePhase = useGameStore((state) => state.setGamePhase)
  const setCountdown = useGameStore((state) => state.setCountdown)

  useEffect(() => {
    if (gamePhase !== 'countdown' || !countdown) return

    const now = Date.now()
    const remainingMs = countdown.startsAt - now

    // 既に時間が過ぎている場合は即座にフェーズを移行
    if (remainingMs <= 0) {
      setGamePhase('playing')
      setCountdown(null)
      return
    }

    // カウントダウン終了時刻に合わせてフェーズを移行する
    const timerId = setTimeout(() => {
      setGamePhase('playing')
      setCountdown(null)
    }, remainingMs)

    return () => clearTimeout(timerId)
  }, [gamePhase, countdown, setGamePhase, setCountdown])
}

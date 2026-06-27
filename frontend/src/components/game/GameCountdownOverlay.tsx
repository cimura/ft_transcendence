import { useEffect, useState, memo } from 'react'
import { useGameStore } from '../../stores/gameStore'

export const GameCountdownOverlay = memo(function GameCountdownOverlay() {
  const countdown = useGameStore((state) => state.countdown)
  const gamePhase = useGameStore((state) => state.gamePhase)

  const [display, setDisplay] = useState<string | null>(null)
  const [showGo, setShowGo] = useState(false)

  useEffect(() => {
    if (gamePhase === 'countdown' && countdown) {
      let animationFrameId: number

      const updateDisplay = () => {
        const now = Date.now()
        const remainingMs = countdown.startsAt - now

        if (remainingMs > 0) {
          const remainingSec = Math.ceil(remainingMs / 1000).toString()

          setDisplay((prev) => (prev !== remainingSec ? remainingSec : prev))

          animationFrameId = requestAnimationFrame(updateDisplay)
        }
      }

      animationFrameId = requestAnimationFrame(updateDisplay)

      return () => cancelAnimationFrame(animationFrameId)
    }

    if (gamePhase === 'playing') {
      setDisplay(null)
      setShowGo(true)

      const timer = setTimeout(() => {
        setShowGo(false)
      }, 1000)
      return () => clearTimeout(timer)
    }

    setDisplay(null)
    setShowGo(false)
  }, [gamePhase, countdown])

  if (gamePhase === 'countdown' && display) {
    return (
      <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-black/40">
        <span className="text-8xl font-bold text-cyan-400 drop-shadow-[0_0_20px_rgba(0,255,255,0.8)]">
          {display}
        </span>
      </div>
    )
  }

  if (showGo) {
    return (
      <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center">
        <span className="text-8xl font-extrabold italic text-yellow-400 drop-shadow-[0_0_20px_rgba(255,255,0,0.8)]">
          GO!
        </span>
      </div>
    )
  }

  return null
})

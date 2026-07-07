import { useEffect, useState, memo } from 'react'
import { useGameStore } from '../../stores/gameStore'

export const GameCountdownOverlay = memo(function GameCountdownOverlay() {
  const countdown = useGameStore((state) => state.countdown)

  const [display, setDisplay] = useState<string | null>(null)
  const [showGo, setShowGo] = useState(false)

  useEffect(() => {
    if (!countdown) {
      setDisplay(null)
      setShowGo(false)
      return
    }

    let animationFrameId: number
    let timeoutId: number

    const updateDisplay = () => {
      const now = Date.now()
      const remainingMs = countdown.startsAt - now

      if (remainingMs > 0) {
        const remainingSec = Math.ceil(remainingMs / 1000).toString()
        setDisplay((prev) => (prev !== remainingSec ? remainingSec : prev))
        animationFrameId = requestAnimationFrame(updateDisplay)
      } else {
        setDisplay(null)
        setShowGo(true)

        timeoutId = window.setTimeout(() => {
          setShowGo(false)
        }, 1000)
      }
    }
    animationFrameId = requestAnimationFrame(updateDisplay)

    return () => {
      cancelAnimationFrame(animationFrameId)
      clearTimeout(timeoutId)
    }
  }, [countdown])

  if (display) {
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

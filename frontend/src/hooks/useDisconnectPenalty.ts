import { useEffect, useState } from 'react'

export function useDisconnectPenalty(
  roomId: string | undefined,
  isGameOver: boolean,
  playersCount: number
) {
  const [hasPenalty, setHasPenalty] = useState(false)

  // ページ離脱時のペナルティフラグ設定
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!isGameOver && roomId && playersCount >= 2) {
        sessionStorage.setItem('surrenderedRoomId', roomId)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isGameOver, roomId, playersCount])

  // 再訪時のペナルティフラグ回収
  useEffect(() => {
    if (roomId && sessionStorage.getItem('surrenderedRoomId') === roomId) {
      setHasPenalty(true)
      sessionStorage.removeItem('surrenderedRoomId')
    }
  }, [roomId])

  return hasPenalty
}

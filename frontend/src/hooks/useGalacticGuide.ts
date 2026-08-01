import { useEffect, useState } from 'react'
import { getGalacticGuide } from '../api/stats'
import { getApiErrorMessage } from '../api/errors'
import type { GalacticGuide } from '../types/profile'

export const useGalacticGuide = (userId: string | undefined) => {
  const [guide, setGuide] = useState<GalacticGuide | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGuide(null)
      setError(null)
      setLoading(false)
      return
    }

    let ignore = false

    const fetchGuide = async () => {
      try {
        setLoading(true)
        setError(null)

        const data = await getGalacticGuide(userId)

        if (!ignore) {
          setGuide(data)
        }
      } catch (err) {
        if (!ignore) {
          setError(getApiErrorMessage(err, '銀河ガイドの取得に失敗しました。'))
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    fetchGuide()

    return () => {
      ignore = true
    }
  }, [userId])

  return { guide, loading, error }
}

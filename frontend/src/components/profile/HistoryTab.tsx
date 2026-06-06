import { useRef, useEffect } from 'react'
import { useMatchHistory } from '../../hooks/useMatchHistory'
import { MatchHistoryCard } from './MatchHistoryCard'

interface HistoryTabProps {
  userId: string
}

export const HistoryTab = ({ userId }: HistoryTabProps) => {
  const { matches, loading, loadingMore, error, hasMore, loadMore } =
    useMatchHistory(userId)
  const observerRef = useRef<HTMLDivElement>(null)

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    const currentRef = observerRef.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [hasMore, loadingMore, loadMore])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white/60">試合履歴を読み込み中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-red-500">エラー: {error}</div>
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white/60">試合履歴がありません</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      {/* 試合履歴リスト */}
      {matches.map((match) => (
        <MatchHistoryCard key={match.id} match={match} />
      ))}

      {/* Intersection Observer用の要素 */}
      <div ref={observerRef} className="h-4" />

      {/* ローディング表示 */}
      {loadingMore && (
        <div className="flex items-center justify-center py-4">
          <div className="text-white/60">さらに読み込み中...</div>
        </div>
      )}

      {/* これ以上データがない場合 */}
      {!hasMore && matches.length > 0 && (
        <div className="flex items-center justify-center py-4">
          <div className="text-white/40 text-sm">
            すべての試合履歴を表示しました
          </div>
        </div>
      )}
    </div>
  )
}

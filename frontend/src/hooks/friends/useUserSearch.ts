import { useState, useEffect } from 'react'
import { searchUsers } from '../../api/friend'
import { getApiErrorMessage } from '../../api/errors'
import { useFriendStore } from '../../stores/friendStore'
import type { SearchResult } from '../../types/friend'

/**
 * Custom hook for user search with debouncing
 * Provides search functionality and friend request sending
 */
export function useUserSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { sendRequest } = useFriendStore()

  // デバウンス処理：入力が止まってから500ms後に検索実行
  useEffect(() => {
    // クエリが空ならタイマーをセットせずに終了
    if (!query.trim()) {
      return
    }

    // 500msのデバウンスタイマーを設定
    const timeoutId = setTimeout(async () => {
      setLoading(true)
      setError(null)

      try {
        const searchResults = await searchUsers(query)
        setResults(searchResults)
      } catch (err) {
        setError(getApiErrorMessage(err, 'ユーザー検索に失敗しました。'))
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 500)

    // クリーンアップ：次の入力があったらタイマーをキャンセル
    return () => clearTimeout(timeoutId)
  }, [query])

  // フレンド申請を送信
  const handleSendRequest = async (userId: string) => {
    await sendRequest(userId)
    // 検索結果を更新（申請済みに変更）
    setResults((prev) =>
      prev.map((result) =>
        result.id === userId ? { ...result, isPending: true } : result
      )
    )
  }

  // クエリが空の場合は結果を空配列として返す
  const displayResults = query.trim() ? results : []

  return {
    query, // 現在の検索クエリ
    setQuery, // クエリを更新する関数
    results: displayResults, // 検索結果
    loading, // ローディング状態
    error, // エラーメッセージ
    sendRequest: handleSendRequest, // フレンド申請送信
  }
}

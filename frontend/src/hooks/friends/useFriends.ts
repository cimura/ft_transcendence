import { useEffect } from 'react'
import { useFriendStore } from '../../stores/friendStore'

export function useFriends() {
  const { friends, loading, error, fetchFriends, deleteFriend } =
    useFriendStore()

  useEffect(() => {
    fetchFriends()
  }, [fetchFriends])

  return {
    friends, // フレンドリスト
    loading, // ローディング状態
    error, // エラーメッセージ
    deleteFriend, // 削除関数
    refetch: fetchFriends, // 再取得関数
  }
}

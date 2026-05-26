import { useEffect } from 'react'
import { useFriendStore } from '../../stores/friendStore'

/**
 * Custom hook for managing friend requests
 * Provides request list, loading state, and accept/reject actions
 */
export function useFriendRequests() {
  const {
    requests,
    loading,
    error,
    fetchRequests,
    acceptRequest,
    rejectRequest,
  } = useFriendStore()

  // マウント時にリクエスト一覧を取得
  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  return {
    requests, // リクエストリスト
    loading, // ローディング状態
    error, // エラーメッセージ
    acceptRequest, // 承認関数
    rejectRequest, // 拒否関数
    refetch: fetchRequests, // 再取得関数
  }
}

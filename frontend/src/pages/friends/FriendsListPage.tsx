import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Friend } from '../../types/friend'
import { FriendCard } from '../../components/friends/FriendCard'
import { ConfirmDialog } from '../../components/friends/ConfirmDialog'
import { useFriends } from '../../hooks/friends/useFriends'

const ITEMS_PER_PAGE = 4

/**
 * FriendsListPage component
 * Displays a paginated list of friends with delete functionality
 */
export function FriendsListPage() {
  const navigate = useNavigate()
  const { friends, loading, error, deleteFriend } = useFriends()
  const [currentPage, setCurrentPage] = useState(1)
  const [deletingFriend, setDeletingFriend] = useState<Friend | null>(null)

  // ページネーションの計算
  const totalPages = Math.max(1, Math.ceil(friends.length / ITEMS_PER_PAGE))
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const displayedFriends = friends.slice(startIndex, endIndex)
  const displayedCount = Math.min(endIndex, friends.length)

  // 削除ボタンクリック
  const handleDeleteClick = (friend: Friend) => {
    setDeletingFriend(friend)
  }

  // 削除確認
  const handleConfirmDelete = async () => {
    if (deletingFriend) {
      await deleteFriend(deletingFriend.id)
      setDeletingFriend(null)
    }
  }

  // 削除キャンセル
  const handleCancelDelete = () => {
    setDeletingFriend(null)
  }

  // ページ変更
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* メインコンテナ */}
      <div className="relative w-full max-w-4xl">
        {/* 戻るボタン */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 bg-black/50 text-white px-6 py-3 rounded-full border-2 border-white/20 hover:border-white/40 transition-all"
        >
          戻る
        </button>

        {/* タイトル */}
        <div className="bg-black/80 rounded-t-3xl border-2 border-white/30 px-8 py-6 text-center">
          <h1 className="text-4xl font-bold text-white">フレンド一覧</h1>
        </div>

        {/* フレンドリスト */}
        <div className="bg-black/80 border-x-2 border-white/30 px-8 py-6 space-y-4 min-h-[320px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-white text-xl">読み込み中...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-red-500 text-xl">{error}</div>
            </div>
          ) : friends.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-white/50 text-xl">フレンドはいません</div>
            </div>
          ) : (
            displayedFriends.map((friend) => (
              <FriendCard
                key={friend.id}
                friend={friend}
                onDelete={handleDeleteClick}
              />
            ))
          )}
        </div>

        {/* ページネーション */}
        <div className="bg-black/80 border-2 border-t-0 border-white/30 rounded-b-3xl px-8 py-6">
          <div className="flex items-center justify-between">
            {/* 前へボタン */}
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="text-white px-6 py-3 bg-black/50 border-2 border-white/30 rounded-full disabled:opacity-30 disabled:cursor-not-allowed hover:border-white/50 transition-all"
            >
              ←
            </button>

            {/* ページ表示 */}
            <div className="bg-black border-2 border-white/40 rounded-full px-8 py-3">
              <span className="text-white text-2xl font-bold">
                {displayedCount}/{friends.length}
              </span>
            </div>

            {/* 次へボタン */}
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="text-white px-6 py-3 bg-black/50 border-2 border-white/30 rounded-full disabled:opacity-30 disabled:cursor-not-allowed hover:border-white/50 transition-all"
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* 削除確認ダイアログ */}
      <ConfirmDialog
        isOpen={!!deletingFriend}
        friend={deletingFriend}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  )
}

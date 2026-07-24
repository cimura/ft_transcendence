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
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4 relative">
      {/* メインコンテナ */}
      <div className="relative w-full max-w-4xl z-10 mt-12">
        {/* 戻るボタン */}
        <button
          onClick={() => navigate('/friends', { replace: true })}
          className="absolute -top-16 left-0 bg-black/40 backdrop-blur-md text-cyan-100 px-6 py-2 rounded-full border border-cyan-500/50 hover:bg-cyan-900/50 hover:border-cyan-300 hover:shadow-[0_0_15px_rgba(0,255,255,0.3)] transition-all"
        >
          &lt; 戻る
        </button>

        {/* タイトル */}
        <div className="bg-black/50 backdrop-blur-md rounded-t-3xl border border-cyan-500/30 px-8 py-6 text-center relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-70" />
          <h1 className="text-4xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 drop-shadow-[0_0_10px_rgba(0,255,255,0.3)]">
            フレンド一覧
          </h1>
        </div>

        {/* フレンドリスト */}
        <div className="bg-black/50 backdrop-blur-md border-x border-cyan-500/30 px-8 py-6 space-y-4 min-h-[320px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-cyan-100/60 text-xl animate-pulse">
                読み込み中...
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-red-400 text-xl">{error}</div>
            </div>
          ) : friends.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-cyan-100/50 text-xl tracking-widest">
                フレンドはいません
              </div>
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
        <div className="bg-black/50 backdrop-blur-md border border-t-0 border-cyan-500/30 rounded-b-3xl px-8 py-6">
          <div className="flex items-center justify-between">
            {/* 前へボタン */}
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="text-cyan-100 px-6 py-3 bg-cyan-950/40 border border-cyan-500/50 rounded-full disabled:opacity-30 disabled:cursor-not-allowed hover:bg-cyan-900/60 hover:border-cyan-300 hover:shadow-[0_0_15px_rgba(0,255,255,0.3)] transition-all"
            >
              &lt;
            </button>

            {/* ページ表示 */}
            <div className="bg-black/40 border border-cyan-500/50 rounded-full px-8 py-3 shadow-[inset_0_0_15px_rgba(0,255,255,0.1)]">
              <span className="text-cyan-100 text-2xl font-bold tracking-widest">
                {displayedCount} <span className="text-cyan-500/50">/</span>{' '}
                {friends.length}
              </span>
            </div>

            {/* 次へボタン */}
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="text-cyan-100 px-6 py-3 bg-cyan-950/40 border border-cyan-500/50 rounded-full disabled:opacity-30 disabled:cursor-not-allowed hover:bg-cyan-900/60 hover:border-cyan-300 hover:shadow-[0_0_15px_rgba(0,255,255,0.3)] transition-all"
            >
              &gt;
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

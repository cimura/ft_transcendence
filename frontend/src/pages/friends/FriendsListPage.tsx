import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Friend } from '../../types/friend'
import { FriendCard } from '../../components/friends/FriendCard'
import { ConfirmDialog } from '../../components/friends/ConfirmDialog'

// モックデータ（バックエンド実装後にuseFriendsフックに切り替える）
const MOCK_FRIENDS: Friend[] = [
  {
    id: 'user-1',
    username: 'ttakino',
    email: 'ttakino@example.com',
    avatarUrl: undefined,
    isOnline: true,
    status: 'online',
    lastSeen: undefined,
  },
  {
    id: 'user-2',
    username: 'sshimura',
    email: 'sshimura@example.com',
    avatarUrl: undefined,
    isOnline: true,
    status: 'online',
    lastSeen: undefined,
  },
  {
    id: 'user-3',
    username: 'rseki',
    email: 'rseki@example.com',
    avatarUrl: undefined,
    isOnline: false,
    status: 'offline',
    lastSeen: new Date('2024-01-15'),
  },
  {
    id: 'user-4',
    username: 'yutakagi',
    email: 'yutakagi@example.com',
    avatarUrl: undefined,
    isOnline: true,
    status: 'in_game',
    lastSeen: undefined,
  },
  {
    id: 'user-5',
    username: 'ryomori',
    email: 'ryomori@example.com',
    avatarUrl: undefined,
    isOnline: true,
    status: 'online',
    lastSeen: undefined,
  },
  // 追加のモックデータ（ページネーションテスト用）
  ...Array.from({ length: 15 }, (_, i) => ({
    id: `user-${i + 6}`,
    username: `user${i + 6}`,
    email: `user${i + 6}@example.com`,
    avatarUrl: undefined,
    isOnline: i % 2 === 0,
    status: (i % 2 === 0 ? 'online' : 'offline') as Friend['status'],
    lastSeen: i % 2 === 0 ? undefined : new Date('2024-01-15'),
  })),
]

const ITEMS_PER_PAGE = 4

/**
 * FriendsListPage component
 * Displays a paginated list of friends with delete functionality
 */
export function FriendsListPage() {
  const navigate = useNavigate()
  const [friends] = useState<Friend[]>(MOCK_FRIENDS)
  const [currentPage, setCurrentPage] = useState(1)
  const [deletingFriend, setDeletingFriend] = useState<Friend | null>(null)

  // ページネーションの計算
  const totalPages = Math.ceil(friends.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const displayedFriends = friends.slice(startIndex, endIndex)
  const displayedCount = Math.min(endIndex, friends.length)

  // 削除ボタンクリック
  const handleDeleteClick = (friend: Friend) => {
    setDeletingFriend(friend)
  }

  // 削除確認
  const handleConfirmDelete = () => {
    if (deletingFriend) {
      // TODO: バックエンド実装後にdeleteFriend(deletingFriend.id)を呼ぶ
      console.log('削除:', deletingFriend.username)
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
        <div className="bg-black/80 border-x-2 border-white/30 px-8 py-6 space-y-4">
          {displayedFriends.map((friend) => (
            <FriendCard
              key={friend.id}
              friend={friend}
              onDelete={handleDeleteClick}
            />
          ))}
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

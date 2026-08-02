import type { Friend } from '../../types/friend'
import { Avatar } from '../common/Avatar'

interface ConfirmDialogProps {
  isOpen: boolean
  friend: Friend | null
  onConfirm: () => void
  onCancel: () => void
}

/**
 * ConfirmDialog component
 * Displays a confirmation dialog for friend deletion
 */
export function ConfirmDialog({
  isOpen,
  friend,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen || !friend) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-black border-4 border-red-500 rounded-3xl p-8 max-w-md w-full mx-4">
        <h2 className="text-white text-3xl font-bold text-center mb-6">
          本当に削除しますか？
        </h2>

        {/* 削除対象のユーザー情報 */}
        <div className="flex items-center gap-4 bg-black/50 border-2 border-white/40 rounded-full px-6 py-4 mb-8">
          <Avatar
            avatarUrl={friend.avatarUrl}
            username={friend.username}
            className="h-12 w-12 rounded-full border border-cyan-400 shadow-[0_0_10px_rgba(0,255,255,0.3)]"
            fallbackClassName="bg-cyan-950 text-cyan-300 font-bold text-xl"
          />
          <p className="text-white text-2xl font-medium">{friend.username}</p>
        </div>

        {/* ボタン */}
        <div className="flex gap-4">
          <button
            onClick={onConfirm}
            className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xl font-bold py-4 rounded-full border-2 border-white/30 hover:border-white/50 transition-all"
          >
            はい
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xl font-bold py-4 rounded-full border-2 border-white/30 hover:border-white/50 transition-all"
          >
            いいえ
          </button>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import type { CreateRoomDto } from '../../types'
import { Modal } from '../common/Modal'
import { useAuthStore } from '../../stores/authStore'

interface Props {
  isOpen: boolean
  onSubmit: (dto: CreateRoomDto) => void
  onClose: () => void
}

const defaultRoomName = (username?: string) =>
  `${username ?? 'Player'} の作戦領域`

export function CreateRoomModal({ isOpen, onSubmit, onClose }: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="作戦領域を新規作成">
      {/* isOpen になるたびにマウントし直すことで、フォームの状態(部屋名など)を都度リセットする */}
      {isOpen && <CreateRoomForm onSubmit={onSubmit} onClose={onClose} />}
    </Modal>
  )
}

interface FormProps {
  onSubmit: (dto: CreateRoomDto) => void
  onClose: () => void
}

function CreateRoomForm({ onSubmit, onClose }: FormProps) {
  const { currentUser } = useAuthStore()
  const [name, setName] = useState(() => defaultRoomName(currentUser?.username))
  const [maxPlayers, setMaxPlayers] = useState<2 | 3 | 4>(2)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onSubmit({ name: trimmed, maxPlayers })
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="roomName"
            className="mb-1.5 block text-xs font-bold tracking-widest text-cyan-400"
          >
            ROOM NAME
          </label>
          <input
            id="roomName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            className="w-full rounded-md border border-cyan-700 bg-cyan-950/30 px-3 py-2 text-sm text-cyan-100 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold tracking-widest text-cyan-400">
            CAPACITY
          </label>
          <div className="flex gap-2">
            {([2, 3, 4] as const).map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setMaxPlayers(count)}
                className={`flex-1 rounded-md border py-2 text-sm font-bold tracking-widest transition-colors ${
                  maxPlayers === count
                    ? 'border-cyan-400 bg-cyan-700/50 text-white shadow-[0_0_10px_rgba(0,255,255,0.3)]'
                    : 'border-cyan-800 bg-black/30 text-cyan-400/70 hover:border-cyan-600 hover:text-cyan-200'
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border border-cyan-800 bg-black/30 py-2 text-sm font-bold tracking-widest text-cyan-300 hover:border-cyan-600 transition-colors"
          >
            CANCEL
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="flex-1 rounded-md border border-cyan-400/60 bg-cyan-600/50 py-2 text-sm font-bold tracking-widest text-white hover:bg-cyan-500/70 hover:shadow-[0_0_15px_rgba(0,255,255,0.4)] disabled:cursor-not-allowed disabled:opacity-50 transition-all"
          >
            CREATE
          </button>
        </div>
      </form>
    </>
  )
}

import React, { useState } from 'react'
import type { CreateRoomDto } from '../../types/room'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'

interface Props {
  isOpen: boolean
  onSubmit: (dto: CreateRoomDto) => void
  onClose: () => void
}

export function CreateRoomModal({ isOpen, onSubmit, onClose }: Props) {
  const [name, setName] = useState('')
  const [maxPlayers, setMaxPlayers] = useState<2 | 3 | 4>(4)

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({ name: name.trim(), maxPlayers })
    setName('')
    onClose()
  }
  const handleClose = () => {
    setName('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="新しい部屋を作成">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 部屋名入力 */}
        <div>
          <label
            htmlFor="roomName"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            部屋名
          </label>
          <input
            id="roomName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="部屋名を入力"
            maxLength={30}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1
  focus:ring-blue-500"
            required
          />
          <p className="mt-1 text-xs text-gray-500">{name.length} / 30文字</p>
        </div>

        {/* 最大プレイヤー数選択 */}
        <div>
          <label
            htmlFor="maxPlayers"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            最大プレイヤー数
          </label>
          <select
            id="maxPlayers"
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(Number(e.target.value) as 2 | 3 | 4)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1
  focus:ring-blue-500"
          >
            <option value={2}>2人</option>
            <option value={3}>3人</option>
            <option value={4}>4人</option>
          </select>
        </div>

        {/* ボタン */}
        <div className="flex gap-3">
          <Button type="submit" variant="primary" className="flex-1">
            作成
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            className="flex-1"
          >
            キャンセル
          </Button>
        </div>
      </form>
    </Modal>
  )
}

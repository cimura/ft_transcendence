import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RoomCard } from './RoomCard'
import type { GameRoom } from '../../types/room'

const buildRoom = (overrides: Partial<GameRoom> = {}): GameRoom => ({
  id: 'room-1',
  name: 'Test Room',
  hostId: 'user-1',
  hostName: 'Host',
  players: [
    { userId: 'user-1', username: 'Host', isReady: true, isHost: true },
  ],
  maxPlayers: 2,
  status: 'waiting',
  mode: 'online',
  createdAt: '2026-07-01T00:00:00.000Z',
  ...overrides,
})

describe('RoomCard', () => {
  it('部屋名・ホスト名・人数を表示する', () => {
    render(<RoomCard room={buildRoom()} onJoin={vi.fn()} />)

    expect(screen.getByText('Test Room')).toBeInTheDocument()
    expect(screen.getByText('Host')).toBeInTheDocument()
    expect(screen.getByText('1/2')).toBeInTheDocument()
  })

  it('満員でない場合は JOIN ボタンが有効になる', () => {
    render(<RoomCard room={buildRoom()} onJoin={vi.fn()} />)

    const button = screen.getByRole('button', { name: 'JOIN' })
    expect(button).toBeEnabled()
  })

  it('満員の場合は FULL と表示しボタンを無効化する', () => {
    const room = buildRoom({
      maxPlayers: 2,
      players: [
        { userId: 'user-1', username: 'Host', isReady: true, isHost: true },
        { userId: 'user-2', username: 'Guest', isReady: false, isHost: false },
      ],
    })
    render(<RoomCard room={room} onJoin={vi.fn()} />)

    const button = screen.getByRole('button', { name: 'FULL' })
    expect(button).toBeDisabled()
  })

  it('JOIN ボタンをクリックすると roomId を渡して onJoin を呼ぶ', async () => {
    const user = userEvent.setup()
    const onJoin = vi.fn()
    render(<RoomCard room={buildRoom({ id: 'room-42' })} onJoin={onJoin} />)

    await user.click(screen.getByRole('button', { name: 'JOIN' }))

    expect(onJoin).toHaveBeenCalledWith('room-42')
  })

  it('満員の場合は onJoin が呼ばれない', async () => {
    const user = userEvent.setup()
    const onJoin = vi.fn()
    const room = buildRoom({
      maxPlayers: 2,
      players: [
        { userId: 'user-1', username: 'Host', isReady: true, isHost: true },
        {
          userId: 'user-2',
          username: 'Guest',
          isReady: false,
          isHost: false,
        },
      ],
    })
    render(<RoomCard room={room} onJoin={onJoin} />)

    await user.click(screen.getByRole('button', { name: 'FULL' }))

    expect(onJoin).not.toHaveBeenCalled()
  })

  it('maxPlayers 分のスロットを描画する', () => {
    const room = buildRoom({ maxPlayers: 4, players: [] })
    const { container } = render(<RoomCard room={room} onJoin={vi.fn()} />)

    const slotsContainer = container.querySelector('.flex.gap-1')
    expect(slotsContainer?.children).toHaveLength(4)
    expect(screen.getByText('0/4')).toBeInTheDocument()
  })
})
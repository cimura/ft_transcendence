import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RoomList } from './RoomList'
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

describe('RoomList', () => {
  it('rooms が空の場合は NO ACTIVE ROOMS を表示する', () => {
    render(<RoomList rooms={[]} onJoin={vi.fn()} />)

    expect(screen.getByText('NO ACTIVE ROOMS')).toBeInTheDocument()
  })

  it('rooms がある場合は RoomCard を一覧表示する', () => {
    const rooms = [
      buildRoom({ id: 'room-1', name: 'Room One' }),
      buildRoom({ id: 'room-2', name: 'Room Two' }),
    ]
    render(<RoomList rooms={rooms} onJoin={vi.fn()} />)

    expect(screen.getByText('Room One')).toBeInTheDocument()
    expect(screen.getByText('Room Two')).toBeInTheDocument()
    expect(screen.queryByText('NO ACTIVE ROOMS')).not.toBeInTheDocument()
  })

  it('各 RoomCard の JOIN ボタンをクリックすると該当の roomId で onJoin を呼ぶ', async () => {
    const user = userEvent.setup()
    const onJoin = vi.fn()
    const rooms = [
      buildRoom({ id: 'room-1', name: 'Room One' }),
      buildRoom({ id: 'room-2', name: 'Room Two' }),
    ]
    render(<RoomList rooms={rooms} onJoin={onJoin} />)

    const joinButtons = screen.getAllByRole('button', { name: 'JOIN' })
    await user.click(joinButtons[1])

    expect(onJoin).toHaveBeenCalledWith('room-2')
  })
})
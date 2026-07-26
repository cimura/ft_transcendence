import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { io } from 'socket.io-client'
import { useRoomSocket } from './useRoomSocket'
import { useRoomStore } from '../stores/roomStore'
import { toGameRoom } from '../utils/roomSnapshot'
import type { RoomSnapshot } from '@ft_transcendence/shared/rooms-events.types'

vi.mock('socket.io-client', () => ({
  io: vi.fn(),
}))

type Handler = (...args: unknown[]) => void

function createFakeSocket() {
  const handlers: Record<string, Handler[]> = {}
  return {
    on: vi.fn((event: string, cb: Handler) => {
      handlers[event] = handlers[event] ?? []
      handlers[event].push(cb)
    }),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    trigger: (event: string, ...args: unknown[]) => {
      ;(handlers[event] ?? []).forEach((cb) => cb(...args))
    },
  }
}

const buildSnapshot = (
  overrides: Partial<RoomSnapshot> = {}
): RoomSnapshot => ({
  id: 'room-1',
  gameId: 'bomberman',
  name: 'Test Room',
  hostId: 'user-1',
  hostName: 'Host',
  players: [
    {
      userId: 'user-1',
      username: 'Host',
      avatarUrl: null,
      isReady: true,
      isHost: true,
    },
  ],
  maxPlayers: 2,
  status: 'waiting',
  mode: 'online',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
  ...overrides,
})

describe('useRoomSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useRoomStore.setState({ rooms: [], currentRoom: null })
  })

  it('roomId が未指定の場合は接続しない', () => {
    renderHook(() => useRoomSocket(undefined))

    expect(io).not.toHaveBeenCalled()
  })

  it('roomId が指定された場合はソケットを作成して接続する', () => {
    const fakeSocket = createFakeSocket()
    vi.mocked(io).mockReturnValue(fakeSocket as never)

    renderHook(() => useRoomSocket('room-1'))

    expect(io).toHaveBeenCalledWith(
      expect.stringContaining('/rooms'),
      expect.objectContaining({ autoConnect: false })
    )
    expect(fakeSocket.connect).toHaveBeenCalled()
  })

  it('connect イベントで room:join を roomId 付きで emit する', () => {
    const fakeSocket = createFakeSocket()
    vi.mocked(io).mockReturnValue(fakeSocket as never)

    renderHook(() => useRoomSocket('room-1'))
    fakeSocket.trigger('connect')

    expect(fakeSocket.emit).toHaveBeenCalledWith('room:join', {
      roomId: 'room-1',
    })
  })

  it('room:updated を受け取ると toGameRoom で変換した結果を upsertRoom する', () => {
    const fakeSocket = createFakeSocket()
    vi.mocked(io).mockReturnValue(fakeSocket as never)

    renderHook(() => useRoomSocket('room-1'))
    const snapshot = buildSnapshot()
    fakeSocket.trigger('room:updated', snapshot)

    expect(useRoomStore.getState().rooms).toEqual([toGameRoom(snapshot)])
  })

  it('room:updated の avatarUrl(null) は undefined に変換されて反映される', () => {
    const fakeSocket = createFakeSocket()
    vi.mocked(io).mockReturnValue(fakeSocket as never)

    renderHook(() => useRoomSocket('room-1'))
    fakeSocket.trigger('room:updated', buildSnapshot())

    expect(useRoomStore.getState().rooms[0].players[0].avatarUrl).toBeUndefined()
  })

  it('room:deleted を受け取ると removeRoom する', () => {
    const fakeSocket = createFakeSocket()
    vi.mocked(io).mockReturnValue(fakeSocket as never)
    useRoomStore.getState().setRooms([toGameRoom(buildSnapshot())])

    renderHook(() => useRoomSocket('room-1'))
    fakeSocket.trigger('room:deleted', { roomId: 'room-1' })

    expect(useRoomStore.getState().rooms).toEqual([])
  })

  it('room:error を受け取ってもクラッシュしない', () => {
    const fakeSocket = createFakeSocket()
    vi.mocked(io).mockReturnValue(fakeSocket as never)

    renderHook(() => useRoomSocket('room-1'))

    expect(() =>
      fakeSocket.trigger('room:error', { message: 'boom' })
    ).not.toThrow()
  })

  it('roomId が変わると新しいルームへ再接続する', () => {
    const fakeSocket1 = createFakeSocket()
    const fakeSocket2 = createFakeSocket()
    vi.mocked(io)
      .mockReturnValueOnce(fakeSocket1 as never)
      .mockReturnValueOnce(fakeSocket2 as never)

    const { rerender } = renderHook(({ roomId }) => useRoomSocket(roomId), {
      initialProps: { roomId: 'room-1' },
    })

    rerender({ roomId: 'room-2' })

    expect(fakeSocket1.disconnect).toHaveBeenCalled()
    expect(io).toHaveBeenCalledTimes(2)
  })

  it('アンマウント時に disconnect する', () => {
    const fakeSocket = createFakeSocket()
    vi.mocked(io).mockReturnValue(fakeSocket as never)

    const { unmount } = renderHook(() => useRoomSocket('room-1'))
    unmount()

    expect(fakeSocket.disconnect).toHaveBeenCalled()
  })
})
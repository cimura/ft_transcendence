import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { io } from 'socket.io-client'
import { useLobbySocket } from './useLobbySocket'
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
  players: [],
  maxPlayers: 2,
  status: 'waiting',
  mode: 'online',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
  ...overrides,
})

describe('useLobbySocket', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    useRoomStore.setState({ rooms: [], currentRoom: null })
  })

  it('マウント時に /rooms namespace のソケットを autoConnect:false で作成し、connect() を呼ぶ', () => {
    const fakeSocket = createFakeSocket()
    vi.mocked(io).mockReturnValue(fakeSocket as never)

    renderHook(() => useLobbySocket())

    expect(io).toHaveBeenCalledWith(
      expect.stringContaining('/rooms'),
      expect.objectContaining({ autoConnect: false })
    )
    expect(fakeSocket.connect).toHaveBeenCalled()
  })

  it('accessToken が存在する場合は auth に Bearer token を付与する', () => {
    localStorage.setItem('accessToken', 'token-123')
    const fakeSocket = createFakeSocket()
    vi.mocked(io).mockReturnValue(fakeSocket as never)

    renderHook(() => useLobbySocket())

    expect(io).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ auth: { token: 'Bearer token-123' } })
    )
  })

  it('accessToken が存在しない場合は auth を undefined にする', () => {
    const fakeSocket = createFakeSocket()
    vi.mocked(io).mockReturnValue(fakeSocket as never)

    renderHook(() => useLobbySocket())

    expect(io).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ auth: undefined })
    )
  })

  it('connect イベントで lobby:join を emit する', () => {
    const fakeSocket = createFakeSocket()
    vi.mocked(io).mockReturnValue(fakeSocket as never)

    renderHook(() => useLobbySocket())
    fakeSocket.trigger('connect')

    expect(fakeSocket.emit).toHaveBeenCalledWith('lobby:join')
  })

  it('lobby:rooms を受け取ると roomStore.setRooms で一覧を置き換える', () => {
    const fakeSocket = createFakeSocket()
    vi.mocked(io).mockReturnValue(fakeSocket as never)

    renderHook(() => useLobbySocket())
    const snapshot = buildSnapshot({ id: 'room-a' })
    fakeSocket.trigger('lobby:rooms', [snapshot])

    expect(useRoomStore.getState().rooms).toEqual([toGameRoom(snapshot)])
  })

  it('room:created を受け取ると roomStore.upsertRoom で追加する', () => {
    const fakeSocket = createFakeSocket()
    vi.mocked(io).mockReturnValue(fakeSocket as never)

    renderHook(() => useLobbySocket())
    const snapshot = buildSnapshot({ id: 'room-new' })
    fakeSocket.trigger('room:created', snapshot)

    expect(useRoomStore.getState().rooms).toEqual([toGameRoom(snapshot)])
  })

  it('room:updated を受け取ると既存ルームを更新する', () => {
    const fakeSocket = createFakeSocket()
    vi.mocked(io).mockReturnValue(fakeSocket as never)
    const initial = buildSnapshot({ id: 'room-1', name: 'Old Name' })
    useRoomStore.getState().setRooms([toGameRoom(initial)])

    renderHook(() => useLobbySocket())
    const updated = buildSnapshot({ id: 'room-1', name: 'New Name' })
    fakeSocket.trigger('room:updated', updated)

    expect(useRoomStore.getState().rooms).toEqual([toGameRoom(updated)])
  })

  it('room:deleted を受け取ると roomStore.removeRoom で除去する', () => {
    const fakeSocket = createFakeSocket()
    vi.mocked(io).mockReturnValue(fakeSocket as never)
    const initial = buildSnapshot({ id: 'room-1' })
    useRoomStore.getState().setRooms([toGameRoom(initial)])

    renderHook(() => useLobbySocket())
    fakeSocket.trigger('room:deleted', { roomId: 'room-1' })

    expect(useRoomStore.getState().rooms).toEqual([])
  })

  it('アンマウント時に lobby:leave を emit してから disconnect する', () => {
    const fakeSocket = createFakeSocket()
    vi.mocked(io).mockReturnValue(fakeSocket as never)

    const { unmount } = renderHook(() => useLobbySocket())
    unmount()

    expect(fakeSocket.emit).toHaveBeenCalledWith('lobby:leave')
    expect(fakeSocket.disconnect).toHaveBeenCalled()
  })

  it('connect_error が発生してもクラッシュしない', () => {
    const fakeSocket = createFakeSocket()
    vi.mocked(io).mockReturnValue(fakeSocket as never)

    renderHook(() => useLobbySocket())

    expect(() =>
      fakeSocket.trigger('connect_error', new Error('boom'))
    ).not.toThrow()
  })
})
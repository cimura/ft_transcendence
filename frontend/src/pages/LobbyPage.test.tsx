import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useNavigate } from 'react-router-dom'
import { LobbyPage } from './LobbyPage'
import { useAuthStore } from '../stores/authStore'
import { useRoomStore } from '../stores/roomStore'
import { getRooms, createRoom, joinRoom, getRoom } from '../api/rooms'
import type { GameRoom } from '../types/room'

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
}))

vi.mock('../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('../stores/roomStore', () => ({
  useRoomStore: vi.fn(),
}))

vi.mock('../hooks/useLobbySocket', () => ({
  useLobbySocket: vi.fn(),
}))

vi.mock('../api/rooms', () => ({
  getRooms: vi.fn(),
  createRoom: vi.fn(),
  joinRoom: vi.fn(),
  getRoom: vi.fn(),
}))

vi.mock('../components/lobby/CreateRoomModal', () => ({
  CreateRoomModal: ({
    isOpen,
    onClose,
    onSubmit,
  }: {
    isOpen: boolean
    onClose: () => void
    onSubmit: (dto: { name: string; maxPlayers: 2 | 3 | 4 }) => void
  }) =>
    isOpen ? (
      <div>
        <button
          onClick={() => onSubmit({ name: 'Mock Room', maxPlayers: 2 })}
        >
          MOCK_SUBMIT
        </button>
        <button onClick={onClose}>MOCK_CLOSE</button>
      </div>
    ) : null,
}))

const mockUseNavigate = vi.mocked(useNavigate)
const mockUseAuthStore = vi.mocked(useAuthStore)
const mockUseRoomStore = vi.mocked(useRoomStore)
const mockGetRooms = vi.mocked(getRooms)
const mockCreateRoom = vi.mocked(createRoom)
const mockJoinRoom = vi.mocked(joinRoom)
const mockGetRoom = vi.mocked(getRoom)

const buildRoom = (overrides: Partial<GameRoom> = {}): GameRoom => ({
  id: 'room-1',
  name: 'Test Room',
  hostId: 'user-1',
  hostName: 'Host',
  players: [{ userId: 'user-1', username: 'Host', isReady: true, isHost: true }],
  maxPlayers: 2,
  status: 'waiting',
  mode: 'online',
  createdAt: '2026-07-01T00:00:00.000Z',
  ...overrides,
})

const buildAxiosError = (status: number) =>
  Object.assign(new Error(`request failed with status ${status}`), {
    isAxiosError: true,
    response: { status },
  })

describe('LobbyPage', () => {
  const navigate = vi.fn()
  const fetchCurrentUser = vi.fn()
  const setRooms = vi.fn()
  const upsertRoom = vi.fn()
  const removeRoom = vi.fn()
  const setCurrentRoom = vi.fn()

  const currentUser = { id: 'user-1', username: 'Alice' }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseNavigate.mockReturnValue(navigate)
    mockUseAuthStore.mockReturnValue({
      currentUser,
      fetchCurrentUser,
    } as unknown as ReturnType<typeof useAuthStore>)
    mockUseAuthStore.getState = vi
      .fn()
      .mockReturnValue({ currentUser }) as unknown as typeof useAuthStore.getState
    mockUseRoomStore.mockReturnValue({
      rooms: [],
      setRooms,
      upsertRoom,
      removeRoom,
      setCurrentRoom,
    } as unknown as ReturnType<typeof useRoomStore>)
    mockGetRooms.mockResolvedValue([])
  })

  it('マウント時に getRooms("waiting") を呼び出し、結果を setRooms に渡す', async () => {
    const rooms = [buildRoom()]
    mockGetRooms.mockResolvedValue(rooms)

    render(<LobbyPage />)

    await waitFor(() => expect(setRooms).toHaveBeenCalledWith(rooms))
    expect(mockGetRooms).toHaveBeenCalledWith('waiting')
  })

  it('getRooms が失敗した場合はエラーをログに出力する', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockGetRooms.mockRejectedValue(new Error('network error'))

    render(<LobbyPage />)

    await waitFor(() =>
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to load rooms:',
        expect.any(Error)
      )
    )
    expect(setRooms).not.toHaveBeenCalled()
    consoleErrorSpy.mockRestore()
  })

  it('status が waiting かつ mode が local_cpu でない部屋のみ表示する(フィルタリング)', () => {
    const rooms = [
      buildRoom({ id: 'room-1', name: 'Waiting Online', status: 'waiting', mode: 'online' }),
      buildRoom({ id: 'room-2', name: 'Waiting LocalCpu', status: 'waiting', mode: 'local_cpu' }),
      buildRoom({ id: 'room-3', name: 'Playing Online', status: 'playing', mode: 'online' }),
    ]
    mockUseRoomStore.mockReturnValue({
      rooms,
      setRooms,
      upsertRoom,
      removeRoom,
      setCurrentRoom,
    } as unknown as ReturnType<typeof useRoomStore>)

    render(<LobbyPage />)

    expect(screen.getByText('Waiting Online')).toBeInTheDocument()
    expect(screen.queryByText('Waiting LocalCpu')).not.toBeInTheDocument()
    expect(screen.queryByText('Playing Online')).not.toBeInTheDocument()
  })

  it('HOME ボタンをクリックすると /home に遷移する', async () => {
    const user = userEvent.setup()
    render(<LobbyPage />)

    await user.click(screen.getByText('← HOME'))

    expect(navigate).toHaveBeenCalledWith('/home')
  })

  it('CREATE ROOM ボタンでモーダルを開き、送信すると createRoom → upsertRoom/setCurrentRoom → 該当ルームへ遷移してモーダルを閉じる', async () => {
    const user = userEvent.setup()
    const createdRoom = buildRoom({ id: 'room-new', name: 'Mock Room' })
    mockCreateRoom.mockResolvedValue(createdRoom)

    render(<LobbyPage />)

    expect(screen.queryByText('MOCK_SUBMIT')).not.toBeInTheDocument()
    await user.click(screen.getByText('+ CREATE ROOM'))
    expect(screen.getByText('MOCK_SUBMIT')).toBeInTheDocument()

    await user.click(screen.getByText('MOCK_SUBMIT'))

    await waitFor(() =>
      expect(mockCreateRoom).toHaveBeenCalledWith({
        name: 'Mock Room',
        maxPlayers: 2,
      })
    )
    expect(upsertRoom).toHaveBeenCalledWith(createdRoom)
    expect(setCurrentRoom).toHaveBeenCalledWith(createdRoom)
    expect(navigate).toHaveBeenCalledWith('/room/room-new')
    await waitFor(() =>
      expect(screen.queryByText('MOCK_SUBMIT')).not.toBeInTheDocument()
    )
  })

  it('ルーム作成に失敗した場合はエラーをログに出力し、モーダルを開いたままにする', async () => {
    const user = userEvent.setup()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockCreateRoom.mockRejectedValue(new Error('failed to create'))

    render(<LobbyPage />)

    await user.click(screen.getByText('+ CREATE ROOM'))
    await user.click(screen.getByText('MOCK_SUBMIT'))

    await waitFor(() =>
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to create room:',
        expect.any(Error)
      )
    )
    expect(upsertRoom).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
    expect(screen.getByText('MOCK_SUBMIT')).toBeInTheDocument()
    consoleErrorSpy.mockRestore()
  })

  it('JOIN ボタンクリックで joinRoom を呼び出し、成功時に該当ルームへ遷移する', async () => {
    const user = userEvent.setup()
    const rooms = [buildRoom({ id: 'room-1', name: 'Waiting Online' })]
    mockUseRoomStore.mockReturnValue({
      rooms,
      setRooms,
      upsertRoom,
      removeRoom,
      setCurrentRoom,
    } as unknown as ReturnType<typeof useRoomStore>)
    const joinedRoom = buildRoom({ id: 'room-1', name: 'Waiting Online' })
    mockJoinRoom.mockResolvedValue(joinedRoom)

    render(<LobbyPage />)
    await user.click(screen.getByRole('button', { name: 'JOIN' }))

    await waitFor(() => expect(mockJoinRoom).toHaveBeenCalledWith('room-1'))
    expect(upsertRoom).toHaveBeenCalledWith(joinedRoom)
    expect(setCurrentRoom).toHaveBeenCalledWith(joinedRoom)
    expect(navigate).toHaveBeenCalledWith('/room/room-1')
  })

  it('currentUser が未取得の場合は fetchCurrentUser を呼び出してから参加処理を行う', async () => {
    const user = userEvent.setup()
    mockUseAuthStore.mockReturnValue({
      currentUser: null,
      fetchCurrentUser,
    } as unknown as ReturnType<typeof useAuthStore>)
    const rooms = [buildRoom({ id: 'room-1' })]
    mockUseRoomStore.mockReturnValue({
      rooms,
      setRooms,
      upsertRoom,
      removeRoom,
      setCurrentRoom,
    } as unknown as ReturnType<typeof useRoomStore>)
    const joinedRoom = buildRoom({ id: 'room-1' })
    mockJoinRoom.mockResolvedValue(joinedRoom)

    render(<LobbyPage />)
    await user.click(screen.getByRole('button', { name: 'JOIN' }))

    expect(fetchCurrentUser).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(mockJoinRoom).toHaveBeenCalledWith('room-1'))
  })

  it('fetchCurrentUser 後も現在のユーザーが取得できない場合は参加処理を行わない', async () => {
    const user = userEvent.setup()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockUseAuthStore.mockReturnValue({
      currentUser: null,
      fetchCurrentUser,
    } as unknown as ReturnType<typeof useAuthStore>)
    mockUseAuthStore.getState = vi
      .fn()
      .mockReturnValue({ currentUser: null }) as unknown as typeof useAuthStore.getState
    const rooms = [buildRoom({ id: 'room-1' })]
    mockUseRoomStore.mockReturnValue({
      rooms,
      setRooms,
      upsertRoom,
      removeRoom,
      setCurrentRoom,
    } as unknown as ReturnType<typeof useRoomStore>)

    render(<LobbyPage />)
    await user.click(screen.getByRole('button', { name: 'JOIN' }))

    await waitFor(() =>
      expect(consoleErrorSpy).toHaveBeenCalledWith('Current user is not loaded')
    )
    expect(mockJoinRoom).not.toHaveBeenCalled()
    consoleErrorSpy.mockRestore()
  })

  it('join が 403/404 で失敗した場合は removeRoom を呼び出す', async () => {
    const user = userEvent.setup()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const rooms = [buildRoom({ id: 'room-1' })]
    mockUseRoomStore.mockReturnValue({
      rooms,
      setRooms,
      upsertRoom,
      removeRoom,
      setCurrentRoom,
    } as unknown as ReturnType<typeof useRoomStore>)
    mockJoinRoom.mockRejectedValue(buildAxiosError(403))

    render(<LobbyPage />)
    await user.click(screen.getByRole('button', { name: 'JOIN' }))

    await waitFor(() => expect(removeRoom).toHaveBeenCalledWith('room-1'))
    expect(navigate).not.toHaveBeenCalledWith('/room/room-1')
    consoleErrorSpy.mockRestore()
  })

  it('join が 409 で失敗し、最新状態で既に参加済みの場合は該当ルームへ遷移する', async () => {
    const user = userEvent.setup()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const rooms = [buildRoom({ id: 'room-1' })]
    mockUseRoomStore.mockReturnValue({
      rooms,
      setRooms,
      upsertRoom,
      removeRoom,
      setCurrentRoom,
    } as unknown as ReturnType<typeof useRoomStore>)
    mockJoinRoom.mockRejectedValue(buildAxiosError(409))
    const latestRoom = buildRoom({
      id: 'room-1',
      players: [
        { userId: 'user-1', username: 'Alice', isReady: false, isHost: false },
      ],
    })
    mockGetRoom.mockResolvedValue(latestRoom)

    render(<LobbyPage />)
    await user.click(screen.getByRole('button', { name: 'JOIN' }))

    await waitFor(() => expect(mockGetRoom).toHaveBeenCalledWith('room-1'))
    expect(upsertRoom).toHaveBeenCalledWith(latestRoom)
    expect(setCurrentRoom).toHaveBeenCalledWith(latestRoom)
    expect(navigate).toHaveBeenCalledWith('/room/room-1')
    expect(removeRoom).not.toHaveBeenCalled()
    consoleErrorSpy.mockRestore()
  })

  it('join が 409 で失敗し、まだ参加していない場合は一覧を更新するだけで遷移しない', async () => {
    const user = userEvent.setup()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const rooms = [buildRoom({ id: 'room-1' })]
    mockUseRoomStore.mockReturnValue({
      rooms,
      setRooms,
      upsertRoom,
      removeRoom,
      setCurrentRoom,
    } as unknown as ReturnType<typeof useRoomStore>)
    mockJoinRoom.mockRejectedValue(buildAxiosError(409))
    const latestRoom = buildRoom({
      id: 'room-1',
      players: [
        { userId: 'other-user', username: 'Bob', isReady: false, isHost: true },
      ],
    })
    mockGetRoom.mockResolvedValue(latestRoom)

    render(<LobbyPage />)
    await user.click(screen.getByRole('button', { name: 'JOIN' }))

    await waitFor(() => expect(upsertRoom).toHaveBeenCalledWith(latestRoom))
    expect(setCurrentRoom).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalledWith('/room/room-1')
    consoleErrorSpy.mockRestore()
  })

  it('409 後の再取得も 403/404 で失敗した場合は removeRoom を呼び出す', async () => {
    const user = userEvent.setup()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const rooms = [buildRoom({ id: 'room-1' })]
    mockUseRoomStore.mockReturnValue({
      rooms,
      setRooms,
      upsertRoom,
      removeRoom,
      setCurrentRoom,
    } as unknown as ReturnType<typeof useRoomStore>)
    mockJoinRoom.mockRejectedValue(buildAxiosError(409))
    mockGetRoom.mockRejectedValue(buildAxiosError(404))

    render(<LobbyPage />)
    await user.click(screen.getByRole('button', { name: 'JOIN' }))

    await waitFor(() => expect(removeRoom).toHaveBeenCalledWith('room-1'))
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to refresh room after join conflict:',
      expect.anything()
    )
    consoleErrorSpy.mockRestore()
  })

  it('join がその他のエラー(axios 以外)で失敗した場合はログ出力のみ行う', async () => {
    const user = userEvent.setup()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const rooms = [buildRoom({ id: 'room-1' })]
    mockUseRoomStore.mockReturnValue({
      rooms,
      setRooms,
      upsertRoom,
      removeRoom,
      setCurrentRoom,
    } as unknown as ReturnType<typeof useRoomStore>)
    mockJoinRoom.mockRejectedValue(new Error('unexpected failure'))

    render(<LobbyPage />)
    await user.click(screen.getByRole('button', { name: 'JOIN' }))

    await waitFor(() =>
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to join room:',
        expect.any(Error)
      )
    )
    expect(removeRoom).not.toHaveBeenCalled()
    expect(upsertRoom).not.toHaveBeenCalled()
    consoleErrorSpy.mockRestore()
  })
})
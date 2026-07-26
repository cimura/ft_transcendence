import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateRoomModal } from './CreateRoomModal'
import { useAuthStore } from '../../stores/authStore'

vi.mock('../../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

const mockUseAuthStore = vi.mocked(useAuthStore)

describe('CreateRoomModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuthStore.mockReturnValue({
      currentUser: { username: 'Alice' },
    } as unknown as ReturnType<typeof useAuthStore>)
  })

  it('isOpen が false の場合は何も描画しない', () => {
    render(
      <CreateRoomModal isOpen={false} onSubmit={vi.fn()} onClose={vi.fn()} />
    )

    expect(screen.queryByText('作戦領域を新規作成')).not.toBeInTheDocument()
  })

  it('isOpen が true の場合はユーザー名をもとにデフォルトの部屋名を表示する', () => {
    render(
      <CreateRoomModal isOpen={true} onSubmit={vi.fn()} onClose={vi.fn()} />
    )

    expect(screen.getByText('作戦領域を新規作成')).toBeInTheDocument()
    expect(screen.getByLabelText('ROOM NAME')).toHaveValue(
      'Alice の作戦領域'
    )
  })

  it('currentUser が未取得の場合は Player をデフォルト名にする', () => {
    mockUseAuthStore.mockReturnValue({
      currentUser: null,
    } as unknown as ReturnType<typeof useAuthStore>)

    render(
      <CreateRoomModal isOpen={true} onSubmit={vi.fn()} onClose={vi.fn()} />
    )

    expect(screen.getByLabelText('ROOM NAME')).toHaveValue(
      'Player の作戦領域'
    )
  })

  it('デフォルトの CAPACITY は 2 で、選択を変更できる', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <CreateRoomModal isOpen={true} onSubmit={onSubmit} onClose={vi.fn()} />
    )

    await user.click(screen.getByRole('button', { name: '4' }))
    await user.click(screen.getByRole('button', { name: 'CREATE' }))

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Alice の作戦領域',
      maxPlayers: 4,
    })
  })

  it('部屋名を編集して送信すると trim した値で onSubmit を呼ぶ', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <CreateRoomModal isOpen={true} onSubmit={onSubmit} onClose={vi.fn()} />
    )

    const input = screen.getByLabelText('ROOM NAME')
    await user.clear(input)
    await user.type(input, '  My Room  ')
    await user.click(screen.getByRole('button', { name: 'CREATE' }))

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'My Room',
      maxPlayers: 2,
    })
  })

  it('部屋名が空文字(空白のみ含む)の場合は CREATE ボタンが無効化される', async () => {
    const user = userEvent.setup()
    render(
      <CreateRoomModal isOpen={true} onSubmit={vi.fn()} onClose={vi.fn()} />
    )

    const input = screen.getByLabelText('ROOM NAME')
    await user.clear(input)
    await user.type(input, '   ')

    expect(screen.getByRole('button', { name: 'CREATE' })).toBeDisabled()
  })

  it('CANCEL ボタンをクリックすると onClose を呼ぶ', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <CreateRoomModal isOpen={true} onSubmit={vi.fn()} onClose={onClose} />
    )

    await user.click(screen.getByRole('button', { name: 'CANCEL' }))

    expect(onClose).toHaveBeenCalled()
  })

  it('閉じて再度開くとフォームの状態がリセットされる', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <CreateRoomModal isOpen={true} onSubmit={vi.fn()} onClose={vi.fn()} />
    )

    const input = screen.getByLabelText('ROOM NAME')
    await user.clear(input)
    await user.type(input, 'Changed Name')
    expect(input).toHaveValue('Changed Name')

    rerender(
      <CreateRoomModal isOpen={false} onSubmit={vi.fn()} onClose={vi.fn()} />
    )
    rerender(
      <CreateRoomModal isOpen={true} onSubmit={vi.fn()} onClose={vi.fn()} />
    )

    expect(screen.getByLabelText('ROOM NAME')).toHaveValue(
      'Alice の作戦領域'
    )
  })
})
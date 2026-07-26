import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useNavigate } from 'react-router-dom'
import { Home } from './Home'
import { useAuthStore } from '../stores/authStore'
import { useNotifications } from '../hooks/useNotifications'

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
}))

vi.mock('../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('../hooks/useNotifications', () => ({
  useNotifications: vi.fn(),
}))

const mockUseNavigate = vi.mocked(useNavigate)
const mockUseAuthStore = vi.mocked(useAuthStore)
const mockUseNotifications = vi.mocked(useNotifications)

describe('Home', () => {
  const navigate = vi.fn()
  const fetchCurrentUser = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseNavigate.mockReturnValue(navigate)
    mockUseAuthStore.mockReturnValue({
      currentUser: { id: 'user-1', username: 'Alice' },
      fetchCurrentUser,
      loading: false,
    } as unknown as ReturnType<typeof useAuthStore>)
    mockUseAuthStore.getState = vi.fn().mockReturnValue({
      currentUser: { id: 'user-1', username: 'Alice' },
    }) as unknown as typeof useAuthStore.getState
    mockUseNotifications.mockReturnValue({
      notifications: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
      removeNotification: vi.fn(),
    })
  })

  it('「対戦開始」ボタンをクリックすると /lobby に遷移する(ルーム作成はしない)', async () => {
    const user = userEvent.setup()
    render(<Home />)

    await user.click(screen.getByText('対戦開始'))

    expect(navigate).toHaveBeenCalledWith('/lobby')
    expect(navigate).toHaveBeenCalledTimes(1)
  })

  it('「対戦開始」ボタンは disabled 属性を持たない(isCreatingRoom ロジックの削除確認)', () => {
    render(<Home />)

    const button = screen.getByText('対戦開始').closest('button')
    expect(button).not.toBeDisabled()
  })

  it('ホーム画面の主要ナビゲーション項目を表示する', () => {
    render(<Home />)

    expect(screen.getByText('マイプロフィール')).toBeInTheDocument()
    expect(screen.getByText('フレンド')).toBeInTheDocument()
    expect(screen.getByText('通知')).toBeInTheDocument()
    expect(screen.getByText('ランキング')).toBeInTheDocument()
    expect(screen.getByText('設定')).toBeInTheDocument()
  })
})
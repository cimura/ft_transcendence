import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'
import { useAuthStore } from './stores/authStore'

vi.mock('./stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('./components/common/BackgroundVideo', () => ({
  default: () => <div data-testid="background-video" />,
}))

vi.mock('./components/SignIn', () => ({
  default: () => <div data-testid="sign-in-page" />,
}))

vi.mock('./components/SignUp', () => ({
  default: () => <div data-testid="sign-up-page" />,
}))

vi.mock('./pages/Home', () => ({
  Home: () => <div data-testid="home-page" />,
}))

vi.mock('./pages/LobbyPage', () => ({
  LobbyPage: () => <div data-testid="lobby-page" />,
}))

vi.mock('./pages/WaitingRoom', () => ({
  WaitingRoom: () => <div data-testid="waiting-room-page" />,
}))

vi.mock('./pages/GameRoomPage', () => ({
  GameRoomPage: () => <div data-testid="game-room-page" />,
}))

vi.mock('./pages/friends/FriendsMenuPage', () => ({
  FriendsMenuPage: () => <div data-testid="friends-menu-page" />,
}))

vi.mock('./pages/friends/FriendsListPage', () => ({
  FriendsListPage: () => <div data-testid="friends-list-page" />,
}))

vi.mock('./pages/friends/FriendRequestsPage', () => ({
  FriendRequestsPage: () => <div data-testid="friend-requests-page" />,
}))

vi.mock('./pages/friends/UserSearchPage', () => ({
  UserSearchPage: () => <div data-testid="user-search-page" />,
}))

vi.mock('./pages/ProfilePage', () => ({
  ProfilePage: () => <div data-testid="profile-page" />,
}))

vi.mock('./pages/RankingsPage', () => ({
  RankingsPage: () => <div data-testid="rankings-page" />,
}))

vi.mock('./pages/settings/Settings', () => ({
  Settings: () => <div data-testid="settings-page" />,
}))

vi.mock('./pages/settings/SettingsMenu', () => ({
  SettingsMenu: () => <div data-testid="settings-menu-page" />,
}))

vi.mock('./pages/settings/AccountManagement', () => ({
  AccountManagement: () => <div data-testid="account-management-page" />,
}))

vi.mock('./pages/NotificationsPage', () => ({
  NotificationsPage: () => <div data-testid="notifications-page" />,
}))

vi.mock('./pages/legal/PrivacyPolicyPage', () => ({
  PrivacyPolicyPage: () => <div data-testid="privacy-policy-page" />,
}))

vi.mock('./pages/legal/TermsOfServicePage', () => ({
  TermsOfServicePage: () => <div data-testid="terms-of-service-page" />,
}))

const mockUseAuthStore = vi.mocked(useAuthStore)

const setLoggedIn = (isLoggedIn: boolean) => {
  mockUseAuthStore.mockImplementation(
    (selector: (state: { accessToken: string | null }) => unknown) =>
      selector({ accessToken: isLoggedIn ? 'token-123' : null })
  )
}

describe('App routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    window.history.pushState({}, '', '/')
  })

  it('ログイン状態で /lobby にアクセスすると LobbyPage を表示する', () => {
    setLoggedIn(true)
    window.history.pushState({}, '', '/lobby')

    render(<App />)

    expect(screen.getByTestId('lobby-page')).toBeInTheDocument()
    expect(screen.queryByTestId('home-page')).not.toBeInTheDocument()
    expect(screen.queryByTestId('sign-in-page')).not.toBeInTheDocument()
  })

  it('未ログイン状態で /lobby にアクセスすると /signin にリダイレクトされる', () => {
    setLoggedIn(false)
    window.history.pushState({}, '', '/lobby')

    render(<App />)

    expect(screen.getByTestId('sign-in-page')).toBeInTheDocument()
    expect(screen.queryByTestId('lobby-page')).not.toBeInTheDocument()
    expect(window.location.pathname).toBe('/signin')
  })

  it('ログイン状態で /home にアクセスすると Home を表示する(既存ルートが壊れていないことの確認)', () => {
    setLoggedIn(true)
    window.history.pushState({}, '', '/home')

    render(<App />)

    expect(screen.getByTestId('home-page')).toBeInTheDocument()
    expect(screen.queryByTestId('lobby-page')).not.toBeInTheDocument()
  })
})
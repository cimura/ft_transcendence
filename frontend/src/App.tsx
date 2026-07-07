import { useEffect } from 'react'
import SignIn from './components/SignIn'
import Signup from './components/SignUp'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useLocation,
} from 'react-router-dom'
import { WaitingRoom } from './pages/WaitingRoom'
import { GameRoomPage } from './pages/GameRoomPage'
import { FriendsMenuPage } from './pages/friends/FriendsMenuPage'
import { FriendsListPage } from './pages/friends/FriendsListPage'
import { FriendRequestsPage } from './pages/friends/FriendRequestsPage'
import { UserSearchPage } from './pages/friends/UserSearchPage'
import { ProfilePage } from './pages/ProfilePage'
import { Home } from './pages/Home'
import { Settings } from './pages/settings/Settings'
import { SettingsMenu } from './pages/settings/SettingsMenu'
import { AccountManagement } from './pages/settings/AccountManagement'
import { NotificationSettings } from './pages/settings/NotificationPage'
import { PrivacySettings } from './pages/settings/PrivacySettings'
import { useAuthStore } from './stores/authStore'
import { NotificationsPage } from './pages/NotificationsPage'

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

function AppRoutes() {
  const navigate = useNavigate()
  const location = useLocation()
  const isLoggedIn = useAuthStore((state) => Boolean(state.accessToken))

  useEffect(() => {
    if (
      isLoggedIn &&
      (location.pathname === '/' ||
        location.pathname === '/signup' ||
        location.pathname === '/signin')
    ) {
      navigate('/home', { replace: true })
    }
  }, [isLoggedIn, location.pathname, navigate])

  const handleSignInSuccess = () => {
    navigate('/home')
  }

  const handleSignupSuccess = () => {
    navigate('/home')
  }

  const handleLogoutSuccess = () => {
    navigate('/signin', { replace: true })
  }

  if (!isLoggedIn) {
    return (
      <Routes>
        {/* / に来たら /signin にリダイレクトして、URLを書き換える */}
        <Route path="/" element={<Navigate to="/signin" replace />} />
        <Route
          path="/signin"
          element={
            <SignIn
              onSignInSuccess={handleSignInSuccess}
              onSwitchToSignup={() => navigate('/signup')}
            />
          }
        />
        <Route
          path="/signup"
          element={
            <Signup
              onSignupSuccess={handleSignupSuccess}
              onSwitchToSignIn={() => navigate('/signin')}
            />
          }
        />
        {/* 未ログイン状態で他のURLにアクセスされたらすべてSignInにリダイレクト */}
        <Route path="*" element={<Navigate to="/signin" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/home" element={<Home />} />
      <Route path="/room/:roomId" element={<WaitingRoom />} />
      <Route path="/game/:roomId" element={<GameRoomPage />} />
      <Route path="/notifications" element={<NotificationsPage />} />

      {/* フレンド機能 */}
      <Route path="/friends" element={<FriendsMenuPage />} />
      <Route path="/friends/list" element={<FriendsListPage />} />
      <Route path="/friends/requests" element={<FriendRequestsPage />} />
      <Route path="/friends/search" element={<UserSearchPage />} />

      {/* プロフィール */}
      <Route path="/profile/:userId" element={<ProfilePage />} />

      <Route
        path="/settings"
        element={<Settings onLogout={handleLogoutSuccess} />}
      >
        <Route index element={<SettingsMenu />} /> {/* 設定のトップメニュー */}
        <Route path="account" element={<AccountManagement />} />
        <Route path="notifications" element={<NotificationSettings />} />
        <Route path="privacy" element={<PrivacySettings />} />
      </Route>

      {/* ログイン状態で存在しないURLに入ったら /home にリダイレクト */}
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  )
}

export default App

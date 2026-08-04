import { useEffect, useRef } from 'react'
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
import { LobbyPage } from './pages/LobbyPage'
import { WaitingRoom } from './pages/WaitingRoom'
import { GameRoomPage } from './pages/GameRoomPage'
import { FriendsMenuPage } from './pages/friends/FriendsMenuPage'
import { FriendsListPage } from './pages/friends/FriendsListPage'
import { UserSearchPage } from './pages/friends/UserSearchPage'
import { ProfilePage } from './pages/ProfilePage'
import { RankingsPage } from './pages/RankingsPage'
import { Home } from './pages/Home'
import { Settings } from './pages/settings/Settings'
import { SettingsMenu } from './pages/settings/SettingsMenu'
import { AccountManagement } from './pages/settings/AccountManagement'
import { useAuthStore } from './stores/authStore'
import { NotificationsPage } from './pages/NotificationsPage'
import { useRealtimeSocket } from './hooks/useRealtimeSocket'
import BackgroundVideo from './components/common/BackgroundVideo'
import { PrivacyPolicyPage } from './pages/legal/PrivacyPolicyPage'
import { TermsOfServicePage } from './pages/legal/TermsOfServicePage'

function App() {
  return (
    <BrowserRouter>
      <BackgroundVideo />

      {/* コンテンツが背景の上に重なるように相対位置を指定 */}
      <div className="relative z-10 w-full h-full min-h-screen">
        <AppRoutes />
      </div>
    </BrowserRouter>
  )
}

/**
 * Renders application routes according to the user's authentication state.
 */
function AppRoutes() {
  return (
    <Routes>
      <Route path="/legal/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route path="/legal/terms-of-service" element={<TermsOfServicePage />} />
      <Route
        path="/privacy-policy"
        element={<Navigate to="/legal/privacy-policy" replace />}
      />
      <Route
        path="/terms-of-service"
        element={<Navigate to="/legal/terms-of-service" replace />}
      />
      <Route path="*" element={<AuthenticatedRoutes />} />
    </Routes>
  )
}

/**
 * Renders routes whose behavior depends on the user's authentication state.
 */
function AuthenticatedRoutes() {
  const navigate = useNavigate()
  const location = useLocation()
  const authStatus = useAuthStore((state) => state.authStatus)
  const verifySession = useAuthStore((state) => state.verifySession)
  const isLoggedIn = authStatus === 'authenticated'
  const isVerifyingRef = useRef(false)
  useRealtimeSocket()

  // 起動直後、および新規サインイン/サインアップ直後(setAccessTokenがauthStatusを
  // 'checking' に戻す)に、保存済みトークンが本当に有効かをバックエンドへ確認する。
  // 無効なら 401 が返り、client.ts の interceptor が forceSignOut して SignIn へ委ねる。
  useEffect(() => {
    if (authStatus === 'checking' && !isVerifyingRef.current) {
      isVerifyingRef.current = true
      void verifySession().finally(() => {
        isVerifyingRef.current = false
      })
    }
  }, [authStatus, verifySession])

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

  // トークン検証中は何も描画しない(背景動画のみが見える状態)。
  if (authStatus === 'checking') {
    return null
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
      <Route path="/lobby" element={<LobbyPage />} />
      <Route path="/room/:roomId" element={<WaitingRoom />} />
      <Route path="/game/:roomId" element={<GameRoomPage />} />
      <Route path="/rankings" element={<RankingsPage />} />
      <Route path="/notifications" element={<NotificationsPage />} />

      {/* フレンド機能 */}
      <Route path="/friends" element={<FriendsMenuPage />} />
      <Route path="/friends/list" element={<FriendsListPage />} />
      <Route path="/friends/search" element={<UserSearchPage />} />

      {/* プロフィール */}
      <Route path="/profile/:userId" element={<ProfilePage />} />

      <Route
        path="/settings"
        element={<Settings onLogout={handleLogoutSuccess} />}
      >
        <Route index element={<SettingsMenu />} /> {/* 設定のトップメニュー */}
        <Route path="account" element={<AccountManagement />} />
      </Route>

      {/* ログイン状態で存在しないURLに入ったら /home にリダイレクト */}
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  )
}

export default App

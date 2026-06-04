import { useState } from 'react'
import SignIn from './components/SignIn'
import Signup from './components/Signup'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom'
import { Lobby } from './pages/Lobby'
import { WaitingRoom } from './pages/WaitingRoom'
import { GameRoomPage } from './pages/GameRoomPage'
import { Home } from './pages/Home'
import { FriendsMenuPage } from './pages/friends/FriendsMenuPage'
import { FriendsListPage } from './pages/friends/FriendsListPage'
import { FriendRequestsPage } from './pages/friends/FriendRequestsPage'
import { UserSearchPage } from './pages/friends/UserSearchPage'
import { ProfilePage } from './pages/ProfilePage'

type AuthView = 'SignIn' | 'signup'

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

function AppRoutes() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [authView, setAuthView] = useState<AuthView>('SignIn')
  const navigate = useNavigate()

  const handleSignInSuccess = () => {
    setIsLoggedIn(true)
    navigate('/home')
  }

  const handleSignupSuccess = () => {
    // サインアップ成功後はログイン画面に遷移
    setAuthView('SignIn')
  }

  if (!isLoggedIn) {
    if (authView === 'signup') {
      return (
        <Signup
          onSignupSuccess={handleSignupSuccess}
          onSwitchToSignIn={() => setAuthView('SignIn')}
        />
      )
    }
    return (
      <SignIn
        onSignInSuccess={handleSignInSuccess}
        onSwitchToSignup={() => setAuthView('signup')}
      />
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/home" element={<Home />} />
      <Route path="/lobby" element={<Lobby />} />
      <Route path="/room/:roomId" element={<WaitingRoom />} />
      <Route path="/game/:roomId" element={<GameRoomPage />} />

      {/* フレンド機能 */}
      <Route path="/friends" element={<FriendsMenuPage />} />
      <Route path="/friends/list" element={<FriendsListPage />} />
      <Route path="/friends/requests" element={<FriendRequestsPage />} />
      <Route path="/friends/search" element={<UserSearchPage />} />

      {/* プロフィール */}
      <Route path="/profile/:userId" element={<ProfilePage />} />

      {/* 以下は後で実装 */}
      <Route
        path="/history"
        element={<div className="p-8">対戦履歴画面（準備中）</div>}
      />
      <Route
        path="/settings"
        element={<div className="p-8">設定画面（準備中）</div>}
      />
    </Routes>
  )
}

export default App

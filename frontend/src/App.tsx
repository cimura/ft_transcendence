import { useState, useEffect } from 'react' // ★ useEffect を追加
import SignIn from './components/SignIn'
import Signup from './components/Signup'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useLocation,
} from 'react-router-dom'
import { Lobby } from './pages/Lobby'
import { WaitingRoom } from './pages/WaitingRoom'
import { Home } from './pages/Home'

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
  const [isInitializing, setIsInitializing] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const token = localStorage.getItem('accessToken')

    if (token) {
      setIsLoggedIn(true)

      if (location.pathname === '/' || location.pathname === '/signup') {
        navigate('/home', { replace: true })
      }
    }

    setIsInitializing(false)
  }, [navigate, location.pathname])

  const handleSignInSuccess = () => {
    setIsLoggedIn(true)
    navigate('/home')
  }

  const handleSignupSuccess = () => {
    setIsLoggedIn(true)
    navigate('/home')
  }

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl font-semibold text-gray-600 animate-pulse">
          Loading Session...
        </div>
      </div>
    )
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
      {/* 以下は後で実装 */}
      <Route
        path="/friends"
        element={<div className="p-8">フレンド画面（準備中）</div>}
      />
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

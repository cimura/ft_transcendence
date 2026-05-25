import { useState } from 'react'
import Login from './components/Login'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom'
import { Lobby } from './pages/Lobby'
import { WaitingRoom } from './pages/WaitingRoom'
import { Home } from './pages/Home'

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

function AppRoutes() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const navigate = useNavigate()

  const handleLoginSuccess = () => {
    setIsLoggedIn(true)
    navigate('/home') // ログイン後は必ずホームに遷移
  }

  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />
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

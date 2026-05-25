import { useState } from 'react'
import Login from './components/Login'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Lobby } from './pages/Lobby'
import { WaitingRoom } from './pages/WaitingRoom'
import { Home } from './pages/Home'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const handleLoginSuccess = () => {
    setIsLoggedIn(true)
  }

  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />
  }
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  )
}

export default App

import { useState } from 'react'
import Login from './components/Login'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LobbyPage } from './pages/LobbyPage'
import { WaitingRoom } from './pages/WaitingRoom'

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
        <Route path="/" element={<Navigate to="/lobby" replace />} />
        <Route path="/lobby" element={<LobbyPage />} />
        <Route path="/room/:id" element={<WaitingRoom />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

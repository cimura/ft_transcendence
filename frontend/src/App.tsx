import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './components/Login'
import Scene from './components/Scene'
import { FriendsMenuPage } from './pages/friends/FriendsMenuPage'
import { FriendsListPage } from './pages/friends/FriendsListPage'
import { FriendRequestsPage } from './pages/friends/FriendRequestsPage'
import { UserSearchPage } from './pages/friends/UserSearchPage'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const handleLoginSuccess = () => {
    setIsLoggedIn(true)
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* フレンド機能 */}
        <Route path="/friends" element={<FriendsMenuPage />} />
        <Route path="/friends/list" element={<FriendsListPage />} />
        <Route path="/friends/requests" element={<FriendRequestsPage />} />
        <Route path="/friends/search" element={<UserSearchPage />} />

        {/* 既存のルート */}
        <Route
          path="/"
          element={
            isLoggedIn ? (
              <Scene />
            ) : (
              <Login onLoginSuccess={handleLoginSuccess} />
            )
          }
        />

        {/* 404ページ */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

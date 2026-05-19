import { useState } from 'react'
import Login from './components/Login'
import Scene from './components/Scene'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const handleLoginSuccess = () => {
    setIsLoggedIn(true)
  }

  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />
  }
  return <Scene />
}

export default App

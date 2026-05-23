import { useState } from 'react'
import Login from './components/Login'
import Signup from './components/Signup'
import Scene from './components/Scene'

type AuthView = 'login' | 'signup'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [authView, setAuthView] = useState<AuthView>('login')

  const handleLoginSuccess = () => {
    setIsLoggedIn(true)
  }

  const handleSignupSuccess = () => {
    // サインアップ成功後はログイン画面に遷移
    setAuthView('login')
  }

  if (!isLoggedIn) {
    if (authView === 'signup') {
      return (
        <Signup
          onSignupSuccess={handleSignupSuccess}
          onSwitchToLogin={() => setAuthView('login')}
        />
      )
    }
    return (
      <Login
        onLoginSuccess={handleLoginSuccess}
        onSwitchToSignup={() => setAuthView('signup')}
      />
    )
  }
  return <Scene />
}

export default App

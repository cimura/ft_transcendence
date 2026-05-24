import { useState } from 'react'
import SignIn from './components/SignIn'
import Signup from './components/Signup'
import Scene from './components/Scene'

type AuthView = 'SignIn' | 'signup'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [authView, setAuthView] = useState<AuthView>('SignIn')

  const handleSignInSuccess = () => {
    setIsLoggedIn(true)
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
  return <Scene />
}

export default App

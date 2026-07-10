import axios from 'axios'
import { useState } from 'react'
import { signInApi, AuthApiError } from '../api/auth'
import { useAuthStore } from '../stores/authStore'
import type { LoginCredentials } from '../types/user'
import { AuthShell } from './AuthShell'

interface SignInProps {
  onSignInSuccess: () => void
  onSwitchToSignup: () => void
}

const isBackendUnavailable = (error: unknown) =>
  axios.isAxiosError(error) && !error.response

export default function SignIn({
  onSignInSuccess,
  onSwitchToSignup,
}: SignInProps) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setCurrentUser, setAccessToken } = useAuthStore()

  const handleSignIn = async (formData: FormData) => {
    const identifier = formData.get('identifier') as string
    const password = formData.get('password') as string

    const credentials: LoginCredentials = {
      identifier,
      password,
    }

    try {
      setError('')
      setLoading(true)

      const data = await signInApi(credentials)

      setAccessToken(data.accessToken)
      console.log('SignIn successful!')
      onSignInSuccess()
    } catch (err) {
      const shouldUseMockAuth = import.meta.env.DEV && isBackendUnavailable(err)

      if (shouldUseMockAuth) {
        setCurrentUser({
          id: 'current-user-id',
          email: identifier,
          username: 'current_user',
          displayName: 'Current User',
          avatarUrl: '/avatars/default-1.svg',
          isGuest: false,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date(),
        })
        setAccessToken(null)
        console.warn('SignIn backend unavailable. Using mock auth.', err)
        onSignInSuccess()
        return
      }

      if (err instanceof AuthApiError) {
        setError(err.message)
      } else {
        setError('予期せぬエラーが発生しました。')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell eyebrow="IDENTITY CHECKPOINT" title="SIGN IN">
        <form action={handleSignIn} className="terminal-form">
          {error && (
            <div className="terminal-alert" role="alert">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="identifier" className="terminal-label">
              Username or Email
            </label>
            <input
              type="text"
              id="identifier"
              name="identifier"
              required
              autoComplete="username"
              className="terminal-input"
            />
          </div>
          <div>
            <label htmlFor="password" className="terminal-label">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              required
              autoComplete="current-password"
              className="terminal-input"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="terminal-submit"
          >
            {loading ? 'CONNECTING...' : 'ENTER THE NETWORK'}
          </button>
        </form>
        <div className="terminal-switch">
          New traveler?{' '}
          <button
            onClick={onSwitchToSignup}
            className="terminal-link"
          >
            Create an identity
          </button>
        </div>
    </AuthShell>
  )
}

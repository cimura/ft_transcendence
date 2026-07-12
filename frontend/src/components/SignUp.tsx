import { useState } from 'react'
import { signUpApi, AuthApiError } from '../api/auth'
import { useAuthStore } from '../stores/authStore'
import { AuthShell } from './AuthShell'

interface SignupProps {
  onSignupSuccess: () => void
  onSwitchToSignIn: () => void
}

export default function Signup({
  onSignupSuccess,
  onSwitchToSignIn,
}: SignupProps) {
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string
    username?: string
  }>({})
  const [loading, setLoading] = useState(false) // 連打防止用
  const setAccessToken = useAuthStore((state) => state.setAccessToken)

  const handleSignup = async (formData: FormData) => {
    const email = formData.get('email') as string
    const username = formData.get('username') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    const usernameRegex = /^[a-zA-Z0-9_-]+$/
    if (!usernameRegex.test(username)) {
      setFieldErrors({
        username:
          'Username can only contain alphanumeric characters, underscores, and hyphens.',
      })
      return
    }

    try {
      setError('')
      setFieldErrors({})
      setLoading(true)

      const data = await signUpApi({ email, username, password })

      setAccessToken(data.accessToken)

      console.log('Signup successful!')
      onSignupSuccess()
    } catch (err) {
      if (err instanceof AuthApiError) {
        if (err.type === 'CONFLICT') {
          const newFieldErrors: { email?: string; username?: string } = {}
          if (err.fields.includes('email')) {
            newFieldErrors.email = 'This email is already registered.'
          }
          if (err.fields.includes('username')) {
            newFieldErrors.username = 'This username is already taken.'
          }
          setFieldErrors(newFieldErrors)
          return
        }
        // CONFLICT 以外のネットワークエラーや400エラーは共通枠に表示
        setError(err.message)
      } else {
        setError('システムエラーが発生しました。')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell eyebrow="NEW TRAVELER PROTOCOL" title="CREATE IDENTITY">
      <form action={handleSignup} className="terminal-form">
        {error && (
          <div className="terminal-alert" role="alert">
            {error}
          </div>
        )}
        <div>
          <label htmlFor="email" className="terminal-label">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            autoComplete="email"
            className={`terminal-input ${fieldErrors.email ? 'terminal-input--error' : ''}`}
          />
          {fieldErrors.email && (
            <p className="terminal-field-error">{fieldErrors.email}</p>
          )}
        </div>
        <div>
          <label htmlFor="username" className="terminal-label">
            Username
          </label>
          <input
            type="text"
            id="username"
            name="username"
            required
            minLength={3}
            autoComplete="username"
            className={`terminal-input ${fieldErrors.username ? 'terminal-input--error' : ''}`}
          />
          {fieldErrors.username && (
            <p className="terminal-field-error">{fieldErrors.username}</p>
          )}
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
            minLength={8}
            autoComplete="new-password"
            className="terminal-input"
          />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="terminal-label">
            Confirm Password
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            required
            minLength={8}
            autoComplete="new-password"
            className="terminal-input"
          />
        </div>
        <button type="submit" disabled={loading} className="terminal-submit">
          {loading ? 'REGISTERING...' : 'REQUEST PASSPORT'}
        </button>
      </form>
      <div className="terminal-switch">
        Identity already registered?{' '}
        <button onClick={onSwitchToSignIn} className="terminal-link">
          Sign in
        </button>
      </div>
    </AuthShell>
  )
}

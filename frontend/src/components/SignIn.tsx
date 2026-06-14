import axios from 'axios'
import { useState } from 'react'
import { signInApi, AuthApiError } from '../api/auth'
import { useAuthStore } from '../stores/authStore'

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

    try {
      setError('')
      setLoading(true)

      const data = await signInApi({ identifier, password })

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
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">SignIn</h1>
        <form action={handleSignIn} className="space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          {/** Identifier (Email or Username) */}
          <div>
            <label
              htmlFor="identifier"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Username or Email
            </label>
            <input
              type="text"
              id="identifier"
              name="identifier"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {/** Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {/** SignIn Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400"
          >
            {loading ? 'Signing in...' : 'SignIn'}
          </button>
        </form>
        <div className="mt-4 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <button
            onClick={onSwitchToSignup}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Sign up
          </button>
        </div>
      </div>
    </div>
  )
}

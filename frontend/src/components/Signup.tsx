import { useState } from 'react'
import { signUpApi, AuthApiError } from '../api/auth'

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

  const handleSignup = async (formData: FormData) => {
    const email = formData.get('email') as string
    const username = formData.get('username') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    try {
      setError('')
      setFieldErrors({})
      setLoading(true)

      const data = await signUpApi({ email, username, password })

      localStorage.setItem('accessToken', data.accessToken)

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
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">Sign Up</h1>
        <form action={handleSignup} className="space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          {/** Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                fieldErrors.email
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300'
              }`}
            />
            {/* Email conflict error */}
            {fieldErrors.email && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>
            )}
          </div>
          {/** Username */}
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              required
              minLength={3}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                fieldErrors.username
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300'
              }`}
            />
            {/* Username conflict error */}
            {fieldErrors.username && (
              <p className="text-red-500 text-xs mt-1">
                {fieldErrors.username}
              </p>
            )}
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
              minLength={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {/** Confirm Password */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              required
              minLength={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {/** Signup Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400"
          >
            {loading ? 'Registering...' : 'Sign Up'}
          </button>
        </form>
        <div className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <button
            onClick={onSwitchToSignIn}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  )
}

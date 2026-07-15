import { useState } from 'react'
import { signUpApi, AuthApiError } from '../api/auth'
import { useAuthStore } from '../stores/authStore'

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

  // frontend/src/components/SignUp.tsx の return 以降

  return (
    // 背景を透明にして文字色を白ベースに
    <div className="min-h-screen flex items-center justify-center relative text-white">
      
      {/* すりガラス風のカードデザイン */}
      <div className="bg-black/40 backdrop-blur-md border border-cyan-500/30 p-8 rounded-xl shadow-[0_0_20px_rgba(0,255,255,0.15)] w-96 relative z-10">
        <h1 className="text-3xl font-bold mb-6 text-center tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
          Sign Up
        </h1>
        
        <form action={handleSignup} className="space-y-5">
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded backdrop-blur-sm">
              {error}
            </div>
          )}
          
          {/** Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-cyan-100 mb-2"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              className={`w-full px-4 py-2 bg-black/50 border rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${
                fieldErrors.email
                  ? 'border-red-500 focus:ring-red-500 focus:border-transparent'
                  : 'border-cyan-800 focus:ring-cyan-500 focus:border-transparent'
              }`}
              placeholder="Enter your email"
            />
            {fieldErrors.email && (
              <p className="text-red-400 text-xs mt-1">{fieldErrors.email}</p>
            )}
          </div>
          
          {/** Username */}
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-cyan-100 mb-2"
            >
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              required
              minLength={3}
              className={`w-full px-4 py-2 bg-black/50 border rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${
                fieldErrors.username
                  ? 'border-red-500 focus:ring-red-500 focus:border-transparent'
                  : 'border-cyan-800 focus:ring-cyan-500 focus:border-transparent'
              }`}
              placeholder="Enter username"
            />
            {fieldErrors.username && (
              <p className="text-red-400 text-xs mt-1">
                {fieldErrors.username}
              </p>
            )}
          </div>
          
          {/** Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-cyan-100 mb-2"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              required
              minLength={8}
              className="w-full px-4 py-2 bg-black/50 border border-cyan-800 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              placeholder="••••••••"
            />
          </div>
          
          {/** Confirm Password */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-cyan-100 mb-2"
            >
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              required
              minLength={8}
              className="w-full px-4 py-2 bg-black/50 border border-cyan-800 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              placeholder="••••••••"
            />
          </div>
          
          {/** Signup Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-2.5 px-4 rounded-md hover:from-cyan-500 hover:to-blue-500 transition-all font-bold tracking-wide shadow-[0_0_15px_rgba(0,255,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {loading ? 'Registering...' : 'Initialize Account'}
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm text-cyan-200/70">
          Already have an account?{' '}
          <button
            onClick={onSwitchToSignIn}
            className="text-cyan-400 hover:text-cyan-300 hover:underline font-medium transition-colors"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  )
}
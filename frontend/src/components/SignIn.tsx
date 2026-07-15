import axios from 'axios'
import { useState } from 'react'
import { signInApi, AuthApiError } from '../api/auth'
import { useAuthStore } from '../stores/authStore'
import type { LoginCredentials } from '../types/user'

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
    // 背景の gray-100 を削除し、文字色を基本白に
    <div className="min-h-screen flex items-center justify-center relative text-white">
      
      {/* すりガラス風（グラスモーフィズム）のカードデザイン */}
      <div className="bg-black/40 backdrop-blur-md border border-cyan-500/30 p-8 rounded-xl shadow-[0_0_20px_rgba(0,255,255,0.15)] w-96 relative z-10">
        <h1 className="text-3xl font-bold mb-6 text-center tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
          SignIn
        </h1>
        
        <form action={handleSignIn} className="space-y-5">
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded backdrop-blur-sm">
              {error}
            </div>
          )}
          
          {/** Identifier (Email or Username) */}
          <div>
            <label
              htmlFor="identifier"
              className="block text-sm font-medium text-cyan-100 mb-2"
            >
              Username or Email
            </label>
            <input
              type="text"
              id="identifier"
              name="identifier"
              required
              // 入力欄も半透明にし、フォーカス時にネオンブルーに光るように
              className="w-full px-4 py-2 bg-black/50 border border-cyan-800 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              placeholder="Enter your ID"
            />
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
              className="w-full px-4 py-2 bg-black/50 border border-cyan-800 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              placeholder="••••••••"
            />
          </div>
          
          {/** SignIn Button */}
          <button
            type="submit"
            disabled={loading}
            // ボタンをネオンブルーのグラデーションに
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-2.5 px-4 rounded-md hover:from-cyan-500 hover:to-blue-500 transition-all font-bold tracking-wide shadow-[0_0_15px_rgba(0,255,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'Scanning...' : 'Enter System'}
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm text-cyan-200/70">
          Don't have an account?{' '}
          <button
            onClick={onSwitchToSignup}
            className="text-cyan-400 hover:text-cyan-300 hover:underline font-medium transition-colors"
          >
            Sign up
          </button>
        </div>
      </div>
    </div>
  )
}
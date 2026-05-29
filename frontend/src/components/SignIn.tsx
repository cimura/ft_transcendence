import { useState } from 'react'

interface SignInProps {
  onSignInSuccess: () => void
  onSwitchToSignup: () => void
}

export default function SignIn({
  onSignInSuccess,
  onSwitchToSignup,
}: SignInProps) {
  const [error, setError] = useState('')

  const handleSignIn = async (formData: FormData) => {
    const identifier = formData.get('identifier') as string
    const password = formData.get('password') as string

    console.log('SignIn attempt: ', { identifier, password })
    try {
      setError('')
      // TODO: backend API（バックエンドと繋げたら実装）
      // const response = await fetch('/api/auth/signin', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ identifier, password })
      // })

      // 仮の成功
      console.log('SignIn successful: ', { identifier })
      onSignInSuccess()
    } catch {
      setError('ログインに失敗しました')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">SignIn</h1>
        <form action={handleSignIn} className="space-y-4">
          {/** error message */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          {/** Email */}
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
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            SignIn
          </button>
        </form>
        {/** Switch to Signup */}
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

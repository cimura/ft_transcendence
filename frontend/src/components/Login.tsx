import { useState } from "react"

interface LoginProps {
	onLoginSuccess: () => void
}

export default function Login({ onLoginSuccess }: LoginProps) {
	const [error, setError] = useState("")

	const handleLogin = async (formData: FormData) => {
		const email = formData.get('email') as string
		const password = formData.get('password') as string

		console.log('Login attempt: ', { email, password })
		try {
			setError('')
			// TODO: backend API（バックエンドと繋げたら実装）
			// const response = await fetch('/api/auth/login', { ... })

			// 仮の成功
			console.log('Login successful: ', { email })
			onLoginSuccess()
		} catch {
			setError('ログインに失敗しました')
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-100">
			<div className="bg-white p-8 rounded-lg shadow-md w-96">
				<h1 className="text-2xl font-bold mb-6 text-center">Login</h1>
				<form action={handleLogin} className="space-y-4">
					{/** error message */}
					{error && (
						<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
							{error}
						</div>
					)}
					{/** Email */}
					<div>
						<label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
							Email
						</label>
						<input type="email" 
									 id="email"
									 name="email"
									 required
									 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>
					{/** Password */}
					<div>
						<label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
							Password
						</label>
						<input type="password" 
									 id="password"
									 name="password"
									 required
									 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>
					{/** Login Button */}
					<button
						type="submit"
						className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
					>
						Login
					</button>
				</form>
			</div>
		</div>
	)
}

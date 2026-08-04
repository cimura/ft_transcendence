import { useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { Button } from './Button'

/**
 * トークンは残っているがユーザー情報を取得できなかった(通信障害など)ときに
 * 保護ルートの代わりに描画するゲート画面。App.tsx の AuthenticatedRoutes から使う。
 */
export function SessionRetry() {
  const error = useAuthStore((state) => state.error)
  const verifySession = useAuthStore((state) => state.verifySession)
  const forceSignOut = useAuthStore((state) => state.forceSignOut)
  const [isRetrying, setIsRetrying] = useState(false)

  const handleRetry = async () => {
    setIsRetrying(true)
    try {
      await verifySession()
    } finally {
      setIsRetrying(false)
    }
  }

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-red-500/40 bg-black/50 backdrop-blur-md p-8 text-center shadow-[0_0_30px_rgba(255,0,0,0.15)]">
        <p className="text-sm font-bold tracking-widest text-red-300">
          [ERROR] アカウント情報を取得できませんでした
        </p>
        <p className="mt-3 text-sm text-cyan-100/70">
          {error || 'ネットワーク接続を確認してください。'}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            variant="primary"
            loading={isRetrying}
            onClick={() => void handleRetry()}
          >
            再試行
          </Button>
          <Button variant="secondary" onClick={forceSignOut}>
            サインインへ戻る
          </Button>
        </div>
      </div>
    </div>
  )
}

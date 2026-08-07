import { useOnlineStatus } from '../../hooks/useOnlineStatus'

/**
 * オフライン中であることを知らせる固定バナー。
 * ソケット接続の自動再試行は utils/socket.ts 側で止めているため、
 * ここでは状態の可視化のみを担う。
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div className="fixed top-0 inset-x-0 z-50 flex justify-center px-4 pt-3 pointer-events-none">
      <div className="pointer-events-auto rounded-lg border border-red-500/40 bg-black/70 backdrop-blur-md px-4 py-2 text-center shadow-[0_0_20px_rgba(255,0,0,0.15)]">
        <p className="text-sm font-bold tracking-widest text-red-300">
          [OFFLINE] インターネット接続が切断されました
        </p>
        <p className="mt-1 text-xs text-cyan-100/70">
          接続が回復すると自動的に再接続します
        </p>
      </div>
    </div>
  )
}

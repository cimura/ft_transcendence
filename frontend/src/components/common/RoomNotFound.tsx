import { useNavigate } from 'react-router-dom'
import { Button } from './Button'

/**
 * ルームIDの形式が不正、またはルームが見つからなかった(すでに解散した等)ときに
 * WaitingRoom / GameRoomPage の代わりに描画するエラー画面。
 * SessionRetry と同じ意匠。自動リダイレクトはせず、URL はそのまま保持する。
 */
export function RoomNotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-red-500/40 bg-black/50 backdrop-blur-md p-8 text-center shadow-[0_0_30px_rgba(255,0,0,0.15)]">
        <p className="text-sm font-bold tracking-widest text-red-300">
          [ERROR] ルームが見つかりません
        </p>
        <p className="mt-3 text-sm text-cyan-100/70">
          URL が間違っているか、ルームがすでに解散した可能性があります。
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button variant="primary" onClick={() => navigate('/lobby')}>
            ロビーへ戻る
          </Button>
          <Button variant="secondary" onClick={() => navigate('/home')}>
            ホームへ
          </Button>
        </div>
      </div>
    </div>
  )
}

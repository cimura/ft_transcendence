import { useNavigate } from 'react-router-dom'

export const SettingsMenu = () => {
  const navigate = useNavigate()

  // 共通のボタンデザインを定義
  const baseButtonClass =
    'w-full flex justify-between items-center px-6 py-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-white font-medium'

  return (
    <div className="grid gap-4">
      <button onClick={() => navigate('account')} className={baseButtonClass}>
        <span>アカウント管理</span>
        <span className="text-white/50">＞</span>
      </button>

      <button
        onClick={() => navigate('notifications')}
        className={baseButtonClass}
      >
        <span>通知設定</span>
        <span className="text-white/50">＞</span>
      </button>

      <button onClick={() => navigate('privacy')} className={baseButtonClass}>
        <span>プライバシー</span>
        <span className="text-white/50">＞</span>
      </button>

      <button
        onClick={() => {
          /* ログアウト処理 */
        }}
        className="w-full px-6 py-4 rounded-xl border border-red-900/50 bg-red-900/10 text-red-400 hover:bg-red-900/20 transition-all font-medium"
      >
        ログアウト
      </button>
    </div>
  )
}

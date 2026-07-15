// frontend/src/pages/settings/Settings.tsx
import { Outlet, useNavigate, useLocation } from 'react-router-dom'

export interface SettingsOutletContext {
  onLogout: () => void
}

interface SettingsProps {
  onLogout: () => void
}

export const Settings = ({ onLogout }: SettingsProps) => {
  const navigate = useNavigate()
  const location = useLocation()
  
  // 現在のパスが /settings 直下かどうかで表示を切り替え
  const isRootSettings = location.pathname === '/settings'

  return (
    // 背景を透明に
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4 relative">
      <div className="relative w-full max-w-2xl z-10">
        
        {/* メインの設定パネル */}
        <div className="bg-black/50 backdrop-blur-md rounded-2xl border border-cyan-500/30 overflow-hidden shadow-[0_0_30px_rgba(0,255,255,0.1)]">
          
          {/* ヘッダー部分 */}
          <div className="relative border-b border-cyan-500/30 px-8 py-6">
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50" />
            
            <div className="flex items-center justify-between">
              {isRootSettings ? (
                // トップメニュー時は「閉じる」ボタン（Homeへ戻る）
                <button
                  onClick={() => navigate('/home')}
                  className="text-cyan-100/60 hover:text-cyan-300 transition-colors flex items-center gap-2 group"
                >
                  <span className="text-xl group-hover:-translate-x-1 transition-transform">×</span>
                  <span className="text-sm font-bold tracking-wider">CLOSE</span>
                </button>
              ) : (
                // サブメニュー時は「戻る」ボタン（トップメニューへ戻る）
                <button
                  onClick={() => navigate('/settings')}
                  className="text-cyan-100/60 hover:text-cyan-300 transition-colors flex items-center gap-2 group"
                >
                  <span className="group-hover:-translate-x-1 transition-transform">&lt;</span>
                  <span className="text-sm font-bold tracking-wider">BACK TO MENU</span>
                </button>
              )}

              {/* タイトル（中央配置） */}
              <h1 className="absolute left-1/2 -translate-x-1/2 text-2xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 drop-shadow-[0_0_8px_rgba(0,255,255,0.3)]">
                {isRootSettings ? 'SYSTEM SETTINGS' : '詳細設定'}
              </h1>
              
              {/* レイアウト調整用の空要素 */}
              <div className="w-[88px]"></div>
            </div>
          </div>

          {/* コンテンツ部分（ここで子メニューが切り替わります） */}
          <div className="p-8">
            <Outlet context={{ onLogout }} />
          </div>
        </div>
      </div>
    </div>
  )
}
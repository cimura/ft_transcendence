import { useState } from 'react'

interface ToggleProps {
  checked: boolean
  onClick: () => void
  label: string
}

const Toggle = ({ checked, onClick, label }: ToggleProps) => (
  <button
    type="button"
    aria-label={label}
    aria-pressed={checked}
    onClick={onClick}
    // トグル自体も光るように
    className={`relative h-7 w-14 rounded-full border transition-all duration-300 ${
      checked 
        ? 'bg-cyan-600/80 border-cyan-400 shadow-[0_0_10px_rgba(0,255,255,0.4)]' 
        : 'bg-black/60 border-cyan-900/50'
    }`}
  >
    <span
      className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-300 ${
        checked ? 'translate-x-7 shadow-[0_0_5px_rgba(255,255,255,0.8)]' : 'translate-x-0 opacity-50'
      }`}
    />
  </button>
)

export const NotificationSettings = () => {
  const [pushEnabled, setPushEnabled] = useState(true)
  const [emailEnabled, setEmailEnabled] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-cyan-500/30 bg-black/40 backdrop-blur-sm p-5 transition-all hover:border-cyan-400 hover:bg-cyan-950/30">
        <span className="font-bold tracking-wider text-cyan-100">プッシュ通知 <span className="text-xs text-cyan-500/60 ml-2">(OFFLINE)</span></span>
        <Toggle
          checked={pushEnabled}
          onClick={() => setPushEnabled((checked) => !checked)}
          label="プッシュ通知を切り替える"
        />
      </div>
      <div className="flex items-center justify-between rounded-xl border border-cyan-500/30 bg-black/40 backdrop-blur-sm p-5 transition-all hover:border-cyan-400 hover:bg-cyan-950/30">
        <span className="font-bold tracking-wider text-cyan-100">メール通知 <span className="text-xs text-cyan-500/60 ml-2">(OFFLINE)</span></span>
        <Toggle
          checked={emailEnabled}
          onClick={() => setEmailEnabled((checked) => !checked)}
          label="メール通知を切り替える"
        />
      </div>
    </div>
  )
}
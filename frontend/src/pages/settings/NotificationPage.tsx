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
    className={`relative h-6 w-12 rounded-full transition-colors ${
      checked ? 'bg-[#b8ff64]' : 'bg-[#153f37]'
    }`}
  >
    <span
      className={`absolute left-0 top-1 h-4 w-4 rounded-full bg-white transition-transform ${
        checked ? 'translate-x-7' : 'translate-x-1'
      }`}
    />
  </button>
)

export const NotificationSettings = () => {
  const [pushEnabled, setPushEnabled] = useState(true)
  const [emailEnabled, setEmailEnabled] = useState(false)

  return (
    <div className="space-y-6">
      <div className="console-panel console-panel--subtle flex items-center justify-between p-4">
        <span className="text-white">プッシュ通知（未実装）</span>
        <Toggle
          checked={pushEnabled}
          onClick={() => setPushEnabled((checked) => !checked)}
          label="プッシュ通知を切り替える"
        />
      </div>
      <div className="console-panel console-panel--subtle flex items-center justify-between p-4">
        <span className="text-white">メール通知（未実装）</span>
        <Toggle
          checked={emailEnabled}
          onClick={() => setEmailEnabled((checked) => !checked)}
          label="メール通知を切り替える"
        />
      </div>
    </div>
  )
}

import { useState } from 'react'

const privacyOptions = ['全体に公開', 'フレンドのみ', '非公開']

export const PrivacySettings = () => {
  const [selectedOption, setSelectedOption] = useState('フレンドのみ')

  return (
    <div className="space-y-4">
      <p className="mb-2 text-sm font-bold tracking-widest text-cyan-400/60">
        SECURITY LEVEL (公開範囲)
      </p>
      
      <div className="grid gap-3">
        {privacyOptions.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={selectedOption === option}
            onClick={() => setSelectedOption(option)}
            className={`flex w-full items-center justify-between rounded-xl border p-5 text-left transition-all duration-300 ${
              selectedOption === option
                ? 'border-cyan-400 bg-cyan-900/40 text-cyan-50 shadow-[0_0_15px_rgba(0,255,255,0.3)]'
                : 'border-cyan-900/50 bg-black/40 text-cyan-100/60 hover:bg-cyan-950/50 hover:border-cyan-500/50 hover:text-cyan-100'
            }`}
          >
            <span className="font-bold tracking-wider">{option}</span>
            {selectedOption === option && (
              <span className="text-xs font-bold tracking-widest text-cyan-300 animate-pulse">
                [ ACTIVE ]
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
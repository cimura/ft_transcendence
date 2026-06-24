import { useState } from 'react'

const privacyOptions = ['全体に公開', 'フレンドのみ', '非公開']

export const PrivacySettings = () => {
  const [selectedOption, setSelectedOption] = useState('フレンドのみ')

  return (
    <div className="space-y-4">
      <p className="mb-4 text-sm text-white/60">プロフィール公開範囲</p>
      {privacyOptions.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={selectedOption === option}
          onClick={() => setSelectedOption(option)}
          className={`flex w-full items-center justify-between rounded-md border p-4 text-left text-white transition-colors ${
            selectedOption === option
              ? 'border-blue-500/70 bg-blue-600/20'
              : 'border-white/10 bg-white/5 hover:bg-white/10'
          }`}
        >
          <span>{option}</span>
          {selectedOption === option && (
            <span className="text-sm text-blue-200">選択中</span>
          )}
        </button>
      ))}
    </div>
  )
}

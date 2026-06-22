export const PrivacySettings = () => {
  return (
    <div className="space-y-4">
      <p className="text-white/60 text-sm mb-4">プロフィール公開範囲</p>
      {['全体に公開', 'フレンドのみ', '非公開'].map((option) => (
        <button
          key={option}
          className="w-full text-left p-4 bg-white/5 rounded-xl border border-white/10 text-white hover:bg-white/10"
        >
          {option}
        </button>
      ))}
    </div>
  )
}

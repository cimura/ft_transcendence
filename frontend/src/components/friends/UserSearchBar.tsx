interface UserSearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

/**
 * UserSearchBar component
 * Search input field for finding users
 */
export function UserSearchBar({
  value,
  onChange,
  placeholder = 'ユーザー名で検索...',
}: UserSearchBarProps) {
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-black/50 border-2 border-white/30 rounded-full px-6 py-3 text-white placeholder:text-white/50 focus:outline-none focus:border-white/60 transition-all"
      />

      {/* 検索アイコン */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
    </div>
  )
}

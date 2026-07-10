type FilterType = 'all' | 'waiting' | 'playing' | 'finished'

interface Props {
  currentFilter: FilterType
  onFilterChange: (filter: FilterType) => void
}

export function RoomFilter({ currentFilter, onFilterChange }: Props) {
  const filters: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'すべて' },
    { value: 'waiting', label: '待機中' },
    { value: 'playing', label: 'プレイ中' },
    { value: 'finished', label: '終了済み' },
  ]
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="部屋フィルター">
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onFilterChange(filter.value)}
          aria-pressed={currentFilter === filter.value}
          className={`border px-4 py-2 text-sm font-bold tracking-wide transition-colors ${
            currentFilter === filter.value
              ? 'border-[#b8ff64] bg-[#b8ff64] text-[#102315]'
              : 'border-emerald-200/30 bg-[#0a2822] text-emerald-50/75 hover:border-emerald-200/60 hover:bg-[#123a31]'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  )
}

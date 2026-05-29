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
    <div className="flex gap-2" role="group" aria-label="部屋フィルター">
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onFilterChange(filter.value)}
          aria-pressed={currentFilter === filter.value}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            currentFilter === filter.value
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  )
}

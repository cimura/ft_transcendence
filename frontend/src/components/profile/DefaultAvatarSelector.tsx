interface DefaultAvatarSelectorProps {
  selectedAvatar: string | null
  onSelect: (avatarUrl: string) => void
}

const DEFAULT_AVATARS = [
  '/avatars/default-1.svg',
  '/avatars/default-2.svg',
  '/avatars/default-3.svg',
  '/avatars/default-4.svg',
  '/avatars/default-5.svg',
]

export const DefaultAvatarSelector = ({
  selectedAvatar,
  onSelect,
}: DefaultAvatarSelectorProps) => {
  return (
    <div>
      <h3 className="text-white font-semibold mb-3">
        デフォルトアバターから選択
      </h3>
      <div className="grid grid-cols-5 gap-3">
        {DEFAULT_AVATARS.map((avatarUrl) => (
          <button
            key={avatarUrl}
            onClick={() => onSelect(avatarUrl)}
            className={`w-16 h-16 rounded-full border-2 transition-all
              ${
                selectedAvatar === avatarUrl
                  ? 'border-green-500 scale-110'
                  : 'border-white/40 hover:border-white/60'
              }
            `}
          >
            <img
              src={avatarUrl}
              alt="Default avatar"
              className="w-full h-full rounded-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  )
}

interface SettingsModalProps {
  title: string
  closeLabel: string
  children: React.ReactNode
  danger?: boolean
  onClose: () => void
}

export const SettingsModal = ({
  title,
  closeLabel,
  children,
  danger = false,
  onClose,
}: SettingsModalProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        className={`w-full max-w-lg rounded-lg border p-6 text-white shadow-2xl ${
          danger
            ? 'border-red-500/30 bg-neutral-950'
            : 'border-white/20 bg-neutral-950'
        }`}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className={`text-xl font-bold ${danger ? 'text-red-200' : ''}`}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1 text-white/60 hover:bg-white/10 hover:text-white"
            aria-label={closeLabel}
          >
            ✕
          </button>
        </div>

        {children}
      </div>
    </div>
  )
}

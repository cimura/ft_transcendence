import { useEffect } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  // close with esc
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#010807]/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="console-panel relative w-full max-w-md p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-wide text-white">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="border border-emerald-100/25 px-2 text-emerald-50/60 hover:border-[#b8ff64] hover:text-[#b8ff64]"
              aria-label="モーダルを閉じる"
            >
              X
            </button>
          </div>
        )}
        <div>{children}</div>
      </div>
    </div>
  )
}

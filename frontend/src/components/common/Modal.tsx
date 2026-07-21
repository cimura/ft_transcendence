import { useEffect } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  className,
}: ModalProps) {
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className={
          className !== undefined
            ? className
            : 'relative w-full max-w-md rounded-2xl border border-cyan-500/50 bg-black/60 backdrop-blur-md p-6 shadow-[0_0_30px_rgba(0,255,255,0.15)] text-cyan-100'
        }
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="mb-4 flex items-center justify-between border-b border-cyan-500/30 pb-3">
            <h2 className="text-xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-cyan-300">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-cyan-500/60 hover:text-cyan-300 transition-colors font-bold text-lg"
              aria-label="モーダルを閉じる"
            >
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

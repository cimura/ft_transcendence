import { Modal } from '../common/Modal'

type RetireConfirmDialogProps = {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function RetireConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
}: RetireConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      className="relative w-full max-w-md bg-black/70 backdrop-blur-xl p-8 text-center"
    >
      <div
        className="absolute inset-2 border border-cyan-400/40 pointer-events-none"
        style={{
          clipPath:
            'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)',
        }}
      />
      <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-red-400 shadow-[0_0_5px_rgba(255,0,0,0.8)] animate-pulse" />
      <div className="absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_5px_rgba(0,255,255,0.8)]" />

      <p className="relative z-10 text-[10px] font-mono font-bold tracking-[0.3em] text-red-300 mb-3 drop-shadow-sm">
        // WARNING
      </p>
      <p className="relative z-10 text-xl font-bold text-white tracking-widest mb-8 drop-shadow-md">
        リタイアとなります。
        <br />
        よろしいですか？
      </p>

      <div className="relative z-10 flex gap-4 justify-center">
        <button
          onClick={onCancel}
          className="flex-1 bg-cyan-900/30 border border-cyan-400/60 text-cyan-100 font-bold tracking-widest py-3 px-6 transition-all duration-300 hover:bg-cyan-800/50 hover:border-cyan-300 hover:shadow-[0_0_15px_rgba(0,255,255,0.35)]"
          style={{
            clipPath:
              'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
          }}
        >
          いいえ
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 bg-black/40 border border-red-400/70 text-red-300 font-bold tracking-widest py-3 px-6 transition-all duration-300 hover:bg-red-500/10 hover:border-red-300 hover:text-red-200 hover:shadow-[0_0_15px_rgba(255,0,0,0.3)]"
          style={{
            clipPath:
              'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
          }}
        >
          はい
        </button>
      </div>
    </Modal>
  )
}

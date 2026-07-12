import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

interface ConsolePageProps {
  title: string
  kicker?: string
  children: ReactNode
  backTo?: string
}

export function ConsolePage({
  title,
  kicker = 'GALACTIC GAME NETWORK / LOCAL TERMINAL',
  children,
  backTo,
}: ConsolePageProps) {
  const navigate = useNavigate()

  return (
    <div className="space-page min-h-screen">
      <header className="console-header">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <div>
            <p className="console-kicker">{kicker}</p>
            <h1 className="console-title">{title}</h1>
          </div>
          <button
            onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
            className="console-button console-button--muted px-4 py-2 text-xs"
          >
            BACK
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <section className="console-panel p-5 sm:p-8">{children}</section>
      </main>
    </div>
  )
}

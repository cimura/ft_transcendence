import type { ReactNode } from 'react'

interface AuthShellProps {
  eyebrow: string
  title: string
  children: ReactNode
}

export function AuthShell({ eyebrow, title, children }: AuthShellProps) {
  return (
    <main className="auth-shell">
      <img
        className="auth-shell__video"
        src="/media/galactic-nav-background.png"
        alt=""
        aria-hidden="true"
      />
      <div className="auth-shell__veil" aria-hidden="true" />
      <div className="auth-shell__coordinates" aria-hidden="true">
        <span>NAV 42.0 / 17.9</span>
        <span>SECTOR: UNLIKELY</span>
      </div>
      <section className="auth-terminal" aria-labelledby="auth-title">
        <div className="auth-terminal__status">
          <span className="signal-dot" />
          GALACTIC NETWORK ONLINE
        </div>
        <p className="terminal-kicker">{eyebrow}</p>
        <h1 id="auth-title" className="auth-terminal__title">
          {title}
        </h1>
        <div className="auth-terminal__rule" />
        {children}
      </section>
      <p className="auth-shell__footer">DON'T PANIC. YOU ARE HERE.</p>
    </main>
  )
}

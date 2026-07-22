import { Link } from 'react-router-dom'

const legalLinks = [
  {
    to: '/legal/privacy-policy',
    label: 'プライバシーポリシー',
  },
  {
    to: '/legal/terms-of-service',
    label: '利用規約',
  },
]

interface LegalLinksProps {
  variant?: 'inline' | 'menu'
}

export function LegalLinks({ variant = 'inline' }: LegalLinksProps) {
  if (variant === 'menu') {
    return (
      <nav aria-label="法務情報" className="grid gap-4">
        {legalLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="flex w-full items-center justify-between rounded-md border border-white/10 bg-white/5 px-6 py-4 text-left font-medium text-white transition-colors hover:bg-white/10"
          >
            <span>{link.label}</span>
            <span aria-hidden="true" className="text-white/50">
              ＞
            </span>
          </Link>
        ))}
      </nav>
    )
  }

  return (
    <nav
      aria-label="法務情報"
      className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 border-t border-gray-200 pt-4 text-xs"
    >
      {legalLinks.map((link, index) => (
        <span key={link.to} className="flex items-center gap-x-3">
          {index > 0 && (
            <span aria-hidden="true" className="text-gray-300">
              |
            </span>
          )}
          <Link
            to={link.to}
            className="text-gray-500 hover:text-blue-700 hover:underline"
          >
            {link.label}
          </Link>
        </span>
      ))}
    </nav>
  )
}

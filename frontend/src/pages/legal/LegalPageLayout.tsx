import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface LegalPageLayoutProps {
  title: string
  lastUpdated: string
  children: ReactNode
}

export function LegalPageLayout({
  title,
  lastUpdated,
  children,
}: LegalPageLayoutProps) {
  return (
    <main className="min-h-screen bg-gray-100 px-4 py-10 text-gray-900 sm:px-6">
      <article className="mx-auto max-w-3xl rounded-lg bg-white p-6 shadow-md sm:p-10">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-gray-500">最終更新日：{lastUpdated}</p>

        <div className="mt-8 space-y-6 leading-7 text-gray-700">{children}</div>

        <Link
          to="/"
          className="mt-10 inline-block font-medium text-blue-600 hover:text-blue-800"
        >
          アプリに戻る
        </Link>
      </article>
    </main>
  )
}

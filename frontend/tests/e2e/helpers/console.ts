import type { Page, Request } from '@playwright/test'

export interface ConsoleIssue {
  kind: 'console' | 'pageerror' | 'requestfailed'
  text: string
}

/**
 * 許可リストは意図的に空で始める。ノイズが出た場合はここに足すのではなく、
 * まず実際のアプリ側の問題かどうかを確認すること。サードパーティ由来など
 * 明らかに対処不能なものだけを、理由コメント付きで追加する。
 */
const ALLOWED_PATTERNS: RegExp[] = []

function isAllowed(text: string): boolean {
  return ALLOWED_PATTERNS.some((pattern) => pattern.test(text))
}

/**
 * ページの console.error / console.warn、キャッチされない例外、失敗したネットワーク
 * リクエストを収集する。呼び出し側は最後に assertNoConsoleIssues() で検査する。
 */
export function attachConsoleGuard(page: Page) {
  const issues: ConsoleIssue[] = []

  page.on('console', (message) => {
    const type = message.type()
    if (type !== 'error' && type !== 'warning') return
    const text = message.text()
    if (isAllowed(text)) return
    issues.push({ kind: 'console', text: `[${type}] ${text}` })
  })

  page.on('pageerror', (error) => {
    if (isAllowed(error.message)) return
    issues.push({ kind: 'pageerror', text: error.message })
  })

  page.on('requestfailed', (request: Request) => {
    // ユーザー操作でキャンセルされた投機的な読み込み等はノイズになるため除外
    const failure = request.failure()?.errorText ?? ''
    if (failure.includes('net::ERR_ABORTED')) return
    const text = `${request.method()} ${request.url()} — ${failure}`
    if (isAllowed(text)) return
    issues.push({ kind: 'requestfailed', text })
  })

  return {
    issues,
    assertNoConsoleIssues(context: string) {
      if (issues.length === 0) return
      const details = issues
        .map((issue) => `  - (${issue.kind}) ${issue.text}`)
        .join('\n')
      throw new Error(`Console issues detected at ${context}:\n${details}`)
    },
  }
}

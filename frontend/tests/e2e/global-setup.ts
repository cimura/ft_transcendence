import type { FullConfig } from '@playwright/test'
import https from 'node:https'

const STACK = process.env.E2E_STACK === 'prod' ? 'prod' : 'dev'

function fetchHtml(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get(url, { rejectUnauthorized: false }, (res) => {
        let body = ''
        res.on('data', (chunk: Buffer) => (body += chunk.toString()))
        res.on('end', () => resolve(body))
      })
      .on('error', reject)
  })
}

/**
 * dev 用 compose は Vite の HMR クライアントスクリプトを埋め込むため、
 * 「コンソールに警告・エラーが無いこと」を検査するテストが dev と prod で別結果になる。
 *
 * webServer(playwright.config.ts)は既に起動済み・応答済みのはずだが、ポート 8443 を
 * 手動で別スタックが握っていた場合(reuseExistingServer: true のため検知できない)、
 * 誤ったスタックをそのまま検査してしまう事故が起きる。ここで応答 HTML から実際の
 * スタック種別を判別し、E2E_STACK の指定と食い違っていれば即座に失敗させる。
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL ?? 'https://localhost:8443'
  const html = await fetchHtml(baseURL)

  // dev: Vite が index.html にソースを直接埋め込む (`/src/main.tsx`)
  // prod: nginx が vite build のハッシュ付きバンドルを配信する (`/assets/index-XXXX.js`)
  const looksLikeDev = html.includes('/src/main.tsx')
  const looksLikeProd = /\/assets\/index-[\w-]+\.js/.test(html)
  const actualStack = looksLikeDev ? 'dev' : looksLikeProd ? 'prod' : 'unknown'

  if (actualStack !== STACK) {
    const fix =
      STACK === 'prod'
        ? '`make dev-down` で開発用スタックを止めてから、`E2E_STACK=prod npx playwright test` を実行してください。'
        : '`make down` で本番スタックを止めてから、`npx playwright test`(E2E_STACK は既定で dev)を実行してください。'

    throw new Error(
      `E2E_STACK=${STACK} を要求しましたが、${baseURL} は "${actualStack}" スタックの応答でした。\n${fix}`
    )
  }
}

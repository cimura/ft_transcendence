import { defineConfig, devices } from '@playwright/test'

// 本番用 compose(docker-compose.prod.yml)でテストすると、本番環境にテスト用データが
// 残ってしまう。既定は dev。`E2E_STACK=prod` を指定すれば本番用に切り替えられる
// (両方とも 8443 を使うため同時起動は不可)。
const STACK = process.env.E2E_STACK === 'prod' ? 'prod' : 'dev'

const COMPOSE_FILE =
  STACK === 'dev'
    ? '../docker/docker-compose.yml'
    : '../docker/docker-compose.prod.yml'

// prod は静的ビルド成果物を配信するため、フロントの変更を反映するには再ビルドがいる。
const WEB_SERVER_COMMAND = `docker compose -f ${COMPOSE_FILE} up --build`

export default defineConfig({
  testDir: './tests/e2e',
  // ルーム/ゲーム状態はバックエンドの in-memory Map(単一プロセス)で共有されているため、
  // テストを並列実行すると互いに干渉する。安定性優先で直列実行する。
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // 実サインアップ・実ソケット接続・複数ブラウザコンテキストをまたぐシナリオが多く、
  // デフォルトの 30s では余裕が無いテストがある(特に 4人対戦や複数コンテキストの同期)。
  timeout: 60_000,
  globalSetup: './tests/e2e/global-setup.ts',
  webServer: {
    command: WEB_SERVER_COMMAND,
    url: 'https://localhost:8443',
    ignoreHTTPSErrors: true,
    reuseExistingServer: true,
    timeout: 180_000,
  },
  use: {
    baseURL: 'https://localhost:8443',
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  reporter: [['html', { open: 'never' }], ['list']],
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          // headless Chromium ではソフトウェア GL が無効な環境があり、R3F(WebGL)の
          // canvas が真っ黒/未描画になることがある。SwiftShader を強制して描画させる。
          args: [
            '--use-gl=angle',
            '--use-angle=swiftshader',
            '--ignore-gpu-blocklist',
          ],
        },
      },
    },
  ],
})

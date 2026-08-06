import { test, expect } from '@playwright/test'
import { makeTestUser } from '../helpers/users'
import { signUpViaUi, loginAsNewUser } from '../helpers/auth'
import { attachConsoleGuard } from '../helpers/console'
import {
  createRoomViaUi,
  joinRoomViaLobby,
  setReady,
  startGame,
} from '../helpers/rooms'

test.describe('コンソール出力', () => {
  test('未ログイン状態の公開ページでコンソールにエラー・警告が出ない', async ({
    page,
  }) => {
    const guard = attachConsoleGuard(page)

    const publicRoutes: { path: string; ready: () => Promise<unknown> }[] = [
      {
        path: '/signin',
        ready: () =>
          expect(
            page.getByRole('button', { name: 'Enter System' })
          ).toBeVisible(),
      },
      {
        path: '/signup',
        ready: () =>
          expect(
            page.getByRole('button', { name: 'Initialize Account' })
          ).toBeVisible(),
      },
      {
        path: '/legal/privacy-policy',
        ready: () =>
          expect(
            page.getByRole('heading', { name: 'プライバシーポリシー' })
          ).toBeVisible(),
      },
      {
        path: '/legal/terms-of-service',
        ready: () =>
          expect(page.getByRole('heading', { name: '利用規約' })).toBeVisible(),
      },
      {
        // /legal/privacy-policy へのリダイレクト
        path: '/privacy-policy',
        ready: () =>
          expect(
            page.getByRole('heading', { name: 'プライバシーポリシー' })
          ).toBeVisible(),
      },
      {
        // /legal/terms-of-service へのリダイレクト
        path: '/terms-of-service',
        ready: () =>
          expect(page.getByRole('heading', { name: '利用規約' })).toBeVisible(),
      },
    ]

    for (const route of publicRoutes) {
      await page.goto(route.path)
      await route.ready()
    }

    guard.assertNoConsoleIssues('public routes')
  })

  test('ログイン後の主要ページでコンソールにエラー・警告が出ない', async ({
    page,
    request,
  }) => {
    const user = await loginAsNewUser(page, request, 'consoleuser')
    const guard = attachConsoleGuard(page)

    await page.goto('/home')
    await expect(page.getByText('対戦開始')).toBeVisible()

    const routesNeedingNoParam: {
      path: string
      ready: () => Promise<unknown>
    }[] = [
      {
        path: '/home',
        ready: () => expect(page.getByText('対戦開始')).toBeVisible(),
      },
      {
        path: '/lobby',
        ready: () =>
          expect(
            page.getByRole('button', { name: '+ CREATE ROOM' })
          ).toBeVisible(),
      },
      {
        path: '/friends',
        ready: () =>
          expect(page.getByRole('heading', { name: 'フレンド' })).toBeVisible(),
      },
      {
        path: '/friends/list',
        ready: () =>
          expect(
            page.getByRole('heading', { name: 'フレンド一覧' })
          ).toBeVisible(),
      },
      {
        path: '/friends/search',
        ready: () =>
          expect(page.getByPlaceholder('ユーザー名で検索...')).toBeVisible(),
      },
      {
        path: '/rankings',
        ready: () =>
          expect(
            page.getByRole('heading', { name: 'ランキング' })
          ).toBeVisible(),
      },
      {
        path: '/notifications',
        ready: () =>
          expect(page.getByRole('heading', { name: '通知' })).toBeVisible(),
      },
      {
        path: '/settings',
        ready: () =>
          expect(
            page.getByRole('button', { name: 'アカウント管理' })
          ).toBeVisible(),
      },
      {
        path: '/settings/account',
        ready: () =>
          expect(
            page.getByRole('button', { name: 'アカウント情報変更' })
          ).toBeVisible(),
      },
    ]

    for (const route of routesNeedingNoParam) {
      await page.goto(route.path)
      await route.ready()
    }

    // 自分のプロフィールページ(ホームの「マイプロフィール」経由で userId を得る)
    await page.goto('/home')
    await page.getByText('マイプロフィール').click()
    await expect(page).toHaveURL(/\/profile\/.+/)
    await expect(
      page.getByRole('heading', { name: user.user.username })
    ).toBeVisible()

    guard.assertNoConsoleIssues('authenticated routes')
  })

  test('ロビー・待機室・ゲーム画面の一連の流れでコンソールにエラー・警告が出ない', async ({
    browser,
  }) => {
    const hostContext = await browser.newContext()
    const guestContext = await browser.newContext()
    const hostPage = await hostContext.newPage()
    const guestPage = await guestContext.newPage()

    const hostGuard = attachConsoleGuard(hostPage)
    const guestGuard = attachConsoleGuard(guestPage)

    const host = makeTestUser('cchost')
    const guest = makeTestUser('ccguest')
    await signUpViaUi(hostPage, host)
    await signUpViaUi(guestPage, guest)

    const roomName = `console-check-${Date.now()}`
    await createRoomViaUi(hostPage, { name: roomName, maxPlayers: 2 })
    await joinRoomViaLobby(guestPage, roomName)
    await setReady(guestPage)
    await startGame(hostPage, [guestPage])

    await expect(hostPage.locator('canvas')).toBeVisible({ timeout: 10_000 })
    await expect(guestPage.locator('canvas')).toBeVisible({ timeout: 10_000 })

    // 実際に操作してから画面遷移させ、ゲーム内の動的な処理でもノイズが出ないか見る
    await hostPage.keyboard.press('ArrowUp')
    await hostPage.waitForTimeout(500)

    await hostContext.close()
    await guestContext.close()

    hostGuard.assertNoConsoleIssues('host game flow')
    guestGuard.assertNoConsoleIssues('guest game flow')
  })
})

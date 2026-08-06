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

    const publicRoutes = [
      '/signin',
      '/signup',
      '/legal/privacy-policy',
      '/legal/terms-of-service',
      '/privacy-policy', // /legal/privacy-policy へのリダイレクト
      '/terms-of-service', // /legal/terms-of-service へのリダイレクト
    ]

    for (const route of publicRoutes) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
    }

    guard.assertNoConsoleIssues('public routes')
  })

  test('ログイン後の主要ページでコンソールにエラー・警告が出ない', async ({
    page,
    request,
  }) => {
    await loginAsNewUser(page, request, 'consoleuser')
    const guard = attachConsoleGuard(page)

    await page.goto('/home')
    await page.waitForLoadState('networkidle')

    const routesNeedingNoParam = [
      '/home',
      '/lobby',
      '/friends',
      '/friends/list',
      '/friends/search',
      '/rankings',
      '/notifications',
      '/settings',
      '/settings/account',
    ]

    for (const route of routesNeedingNoParam) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
    }

    // 自分のプロフィールページ(ホームの「マイプロフィール」経由で userId を得る)
    await page.goto('/home')
    await page.getByText('マイプロフィール').click()
    await expect(page).toHaveURL(/\/profile\/.+/)
    await page.waitForLoadState('networkidle')

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

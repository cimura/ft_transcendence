import { test, expect, type BrowserContext, type Page } from '@playwright/test'
import { makeTestUser } from '../helpers/users'
import { signUpViaUi } from '../helpers/auth'
import {
  createRoomViaUi,
  joinRoomViaLobby,
  setReady,
  startGame,
  retireFromGame,
} from '../helpers/rooms'

// 別々の BrowserContext = 別々の Cookie/Storage/接続を持つ「別端末」に相当する。

/**
 * 同じ端末(= 同じ BrowserContext / localStorage の accessToken を保持)で新しいタブを開き、
 * ホームの「対戦開始」からロビーへ入る。ロビーの socket 接続時に room:rejoin が届けば、
 * 元のルーム/ゲームへ自動遷移する。
 */
async function openTabAndEnterLobby(context: BrowserContext): Promise<Page> {
  const page = await context.newPage()
  await page.goto('/home')
  await page.waitForURL('**/home')
  await page.getByRole('button', { name: '対戦開始' }).click()
  await page.waitForURL(/\/(lobby|room\/|game\/)/)
  return page
}

/**
 * タブを閉じる。page.close() だけだとレンダラが即座に落ちて WebSocket の close が
 * サーバーへ届かないことがあり、その場合サーバーは heartbeat のタイムアウト(最大45秒)
 * まで「まだ接続中」と見なして復帰イベントを出さない。about:blank へ遷移させて
 * ソケットを確実に閉じてから閉じることで、実ブラウザでタブを閉じた場合と揃える。
 */
async function closeTab(page: Page) {
  await page.goto('about:blank')
  await page.close()
}

test.describe('対戦中の切断と再接続', () => {
  test('別端末相当の2コンテキストで対戦が同期し、一時切断後も試合に復帰できる', async ({
    browser,
  }) => {
    const hostContext = await browser.newContext()
    const guestContext = await browser.newContext()
    const hostPage = await hostContext.newPage()
    const guestPage = await guestContext.newPage()

    const host = makeTestUser('remote_host')
    const guest = makeTestUser('remote_guest')
    await signUpViaUi(hostPage, host)
    await signUpViaUi(guestPage, guest)

    const roomName = `remote-${Date.now()}`
    await createRoomViaUi(hostPage, { name: roomName, maxPlayers: 2 })
    await joinRoomViaLobby(guestPage, roomName)
    await setReady(guestPage)
    await startGame(hostPage, [guestPage])

    await expect(hostPage.locator('canvas')).toBeVisible({ timeout: 10_000 })
    await expect(guestPage.locator('canvas')).toBeVisible({ timeout: 10_000 })
    await expect(hostPage.getByText('生存 2')).toBeVisible({ timeout: 15_000 })

    // ゲスト側を意図的に切断する(ネットワーク断をシミュレート)
    await guestContext.setOffline(true)
    await guestPage.waitForTimeout(1000)

    // 切断中もホスト側は破綻しない(画面が残っている・エラーで落ちていない)
    await expect(hostPage.locator('canvas')).toBeVisible()

    // ネットワークを復旧し、ページを再読み込みして再接続させる
    await guestContext.setOffline(false)
    await guestPage.reload()

    // 再接続後、ゲストは試合に復帰できる(待機室へ押し戻されず、ゲーム画面のまま)
    await expect(guestPage.locator('canvas')).toBeVisible({ timeout: 15_000 })
    await expect(guestPage).toHaveURL(/\/game\//)

    await hostContext.close()
    await guestContext.close()
  })
})

test.describe('タブを閉じた後の再参加', () => {
  test('待機室でタブを閉じても、開き直して対戦開始を押すと同じ待機室へ戻る', async ({
    browser,
  }) => {
    const hostContext = await browser.newContext()
    const guestContext = await browser.newContext()
    const hostPage = await hostContext.newPage()
    let guestPage = await guestContext.newPage()

    const host = makeTestUser('reopen_wait_host')
    const guest = makeTestUser('reopen_wait_guest')
    await signUpViaUi(hostPage, host)
    await signUpViaUi(guestPage, guest)

    const roomName = `reopen-wait-${Date.now()}`
    const roomId = await createRoomViaUi(hostPage, {
      name: roomName,
      maxPlayers: 2,
    })
    await joinRoomViaLobby(guestPage, roomName)
    await expect(hostPage.getByText('[2/2]')).toBeVisible({ timeout: 10_000 })

    // 猶予時間(30秒)内に戻れば、待機室の参加者として残っている
    await closeTab(guestPage)
    guestPage = await openTabAndEnterLobby(guestContext)
    await expect(guestPage).toHaveURL(new RegExp(`/room/${roomId}$`), {
      timeout: 15_000,
    })

    await expect(guestPage.getByText(roomName)).toBeVisible({ timeout: 10_000 })
    // ホスト側から見ても、参加者として居続けている
    await expect(hostPage.getByText('[2/2]')).toBeVisible()

    await hostContext.close()
    await guestContext.close()
  })

  test('対戦中にタブを閉じても、開き直して対戦開始を押すと試合へ戻る', async ({
    browser,
  }) => {
    const hostContext = await browser.newContext()
    const guestContext = await browser.newContext()
    const hostPage = await hostContext.newPage()
    let guestPage = await guestContext.newPage()

    const host = makeTestUser('reopen_game_host')
    const guest = makeTestUser('reopen_game_guest')
    await signUpViaUi(hostPage, host)
    await signUpViaUi(guestPage, guest)

    const roomName = `reopen-game-${Date.now()}`
    const roomId = await createRoomViaUi(hostPage, {
      name: roomName,
      maxPlayers: 2,
    })
    await joinRoomViaLobby(guestPage, roomName)
    await setReady(guestPage)
    await startGame(hostPage, [guestPage])
    await expect(guestPage.locator('canvas')).toBeVisible({ timeout: 10_000 })
    await expect(hostPage.getByText('生存 2')).toBeVisible({ timeout: 15_000 })

    await closeTab(guestPage)
    guestPage = await openTabAndEnterLobby(guestContext)
    // 待機室ではなく、進行中の試合そのものへ復帰する
    await expect(guestPage).toHaveURL(new RegExp(`/game/${roomId}$`), {
      timeout: 15_000,
    })

    await expect(guestPage.locator('canvas')).toBeVisible({ timeout: 15_000 })
    await expect(guestPage.getByText('生存 2')).toBeVisible({ timeout: 15_000 })

    await hostContext.close()
    await guestContext.close()
  })

  test('試合が終了した後はどこにも復帰せず、ロビーに留まる', async ({
    browser,
  }) => {
    test.setTimeout(90_000)

    const hostContext = await browser.newContext()
    const guestContext = await browser.newContext()
    let hostPage = await hostContext.newPage()
    const guestPage = await guestContext.newPage()

    const host = makeTestUser('reopen_done_host')
    const guest = makeTestUser('reopen_done_guest')
    await signUpViaUi(hostPage, host)
    await signUpViaUi(guestPage, guest)

    const roomName = `reopen-done-${Date.now()}`
    await createRoomViaUi(hostPage, { name: roomName, maxPlayers: 2 })
    await joinRoomViaLobby(guestPage, roomName)
    await setReady(guestPage)
    await startGame(hostPage, [guestPage])
    await expect(hostPage.getByText('生存 2')).toBeVisible({ timeout: 15_000 })

    // ゲストのリタイアで決着させる(ホスト側には結果が表示される)
    await retireFromGame(guestPage)
    await expect(hostPage.getByText('YOU WIN')).toBeVisible({ timeout: 20_000 })

    await closeTab(hostPage)
    hostPage = await openTabAndEnterLobby(hostContext)

    // 終了済みのルームへは復帰させない
    await expect(hostPage).toHaveURL(/\/lobby$/)
    await expect(
      hostPage.getByRole('button', { name: '+ CREATE ROOM' })
    ).toBeVisible({ timeout: 10_000 })
    // 遅れて room:rejoin が届いて遷移することもない
    await hostPage.waitForTimeout(3_000)
    await expect(hostPage).toHaveURL(/\/lobby$/)

    await hostContext.close()
    await guestContext.close()
  })
})

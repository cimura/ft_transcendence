import { test, expect } from '@playwright/test'
import { makeTestUser } from '../helpers/users'
import { signUpViaUi } from '../helpers/auth'
import {
  createRoomViaUi,
  joinRoomViaLobby,
  setReady,
  startGame,
} from '../helpers/rooms'

// 別々の BrowserContext = 別々の Cookie/Storage/接続を持つ「別端末」に相当する。

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

import { test, expect } from '@playwright/test'
import { makeTestUser } from '../helpers/users'
import { signUpViaUi } from '../helpers/auth'
import {
  createRoomViaUi,
  joinRoomViaLobby,
  setReady,
  startGame,
} from '../helpers/rooms'

test.describe('4人対戦', () => {
  test('4人が同時に対戦でき、全員の画面で同期する', async ({ browser }) => {
    // 4人分のサインアップ・参加・Ready・描画確認を順番に行うため既定の60sでは足りない
    test.setTimeout(120_000)

    const contexts = await Promise.all(
      Array.from({ length: 4 }, () => browser.newContext())
    )
    const pages = await Promise.all(contexts.map((ctx) => ctx.newPage()))
    const [hostPage, ...guestPages] = pages
    const users = Array.from({ length: 4 }, (_, i) => makeTestUser(`p4_${i}`))

    await Promise.all(pages.map((page, i) => signUpViaUi(page, users[i])))

    const roomName = `four-player-${Date.now()}`
    await createRoomViaUi(hostPage, { name: roomName, maxPlayers: 4 })

    for (const guestPage of guestPages) {
      await joinRoomViaLobby(guestPage, roomName)
    }

    await expect(hostPage.getByText('[4/4]')).toBeVisible({ timeout: 10_000 })

    for (const guestPage of guestPages) {
      await setReady(guestPage)
    }

    await startGame(hostPage, guestPages)

    for (const page of pages) {
      await expect(page.locator('canvas')).toBeVisible({ timeout: 10_000 })
    }

    // 全員の画面で 4 人生存の表示が一致する(同期が取れている)
    for (const page of pages) {
      await expect(page.getByText('生存 4')).toBeVisible({ timeout: 15_000 })
    }

    await Promise.all(contexts.map((ctx) => ctx.close()))
  })
})

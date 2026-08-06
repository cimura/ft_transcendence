import { test, expect } from '@playwright/test'
import { makeTestUser } from '../helpers/users'
import { signUpViaUi } from '../helpers/auth'
import { createRoomViaUi, joinRoomViaLobby } from '../helpers/rooms'

test.describe('ロビーと待機室', () => {
  test('ロビー・チャット・退出がリロード無しで即座に同期する', async ({
    browser,
  }) => {
    const hostContext = await browser.newContext()
    const guestContext = await browser.newContext()
    const hostPage = await hostContext.newPage()
    const guestPage = await guestContext.newPage()

    const host = makeTestUser('rt_host')
    const guest = makeTestUser('rt_guest')
    await signUpViaUi(hostPage, host)
    await signUpViaUi(guestPage, guest)

    // ゲストは先にロビー画面を開いて待機しておく(useLobbySocket が接続済みの状態)
    await guestPage.goto('/lobby')

    const roomName = `realtime-${Date.now()}`
    await createRoomViaUi(hostPage, { name: roomName, maxPlayers: 2 })

    // リロードせずに room:created イベントがゲストのロビーへ届く
    await expect(guestPage.getByText(roomName)).toBeVisible({ timeout: 10_000 })

    await joinRoomViaLobby(guestPage, roomName)

    // ゲスト参加が room:updated としてホストの待機室へ即座に反映される
    await expect(hostPage.getByText('SQUAD')).toBeVisible()
    await expect(hostPage.getByText(guest.username)).toBeVisible({
      timeout: 10_000,
    })
    await expect(hostPage.getByText('[2/2]')).toBeVisible({ timeout: 10_000 })

    // チャットが往復でリアルタイムに届く
    const guestMessage = `guest says hi ${Date.now()}`
    await guestPage.locator('#chat-message').fill(guestMessage)
    await guestPage.getByRole('button', { name: 'SEND' }).click()
    await expect(hostPage.getByText(guestMessage)).toBeVisible({
      timeout: 10_000,
    })

    const hostMessage = `host says hi ${Date.now()}`
    await hostPage.locator('#chat-message').fill(hostMessage)
    await hostPage.getByRole('button', { name: 'SEND' }).click()
    await expect(guestPage.getByText(hostMessage)).toBeVisible({
      timeout: 10_000,
    })

    // ゲストが明示的に退出すると、ホストの SQUAD 表示がリロード無しで即座に更新される
    await guestPage.getByRole('button', { name: 'EMERGENCY EXIT' }).click()
    await expect(hostPage.getByText('[1/2]')).toBeVisible({ timeout: 10_000 })

    await hostContext.close()
    await guestContext.close()
  })

  test('チャットの送信者名からプロフィールへ遷移できる', async ({
    browser,
  }) => {
    const hostContext = await browser.newContext()
    const guestContext = await browser.newContext()
    const hostPage = await hostContext.newPage()
    const guestPage = await guestContext.newPage()

    const host = makeTestUser('chat_host')
    const guest = makeTestUser('chat_guest')
    await signUpViaUi(hostPage, host)
    await signUpViaUi(guestPage, guest)

    const roomName = `chat-check-${Date.now()}`
    await createRoomViaUi(hostPage, { name: roomName, maxPlayers: 2 })
    await joinRoomViaLobby(guestPage, roomName)

    const message = `hello from guest ${Date.now()}`
    await guestPage.locator('#chat-message').fill(message)
    await guestPage.getByRole('button', { name: 'SEND' }).click()

    await expect(hostPage.getByText(message)).toBeVisible({ timeout: 10_000 })

    await hostPage.getByRole('button', { name: guest.username }).click()
    await expect(hostPage).toHaveURL(/\/profile\/.+/)

    await hostContext.close()
    await guestContext.close()
  })

  test('ホストが待機室を退出すると次の参加者へホストが引き継がれる', async ({
    browser,
  }) => {
    const hostContext = await browser.newContext()
    const guestContext = await browser.newContext()
    const hostPage = await hostContext.newPage()
    const guestPage = await guestContext.newPage()

    const host = makeTestUser('transfer_host')
    const guest = makeTestUser('transfer_guest')
    await signUpViaUi(hostPage, host)
    await signUpViaUi(guestPage, guest)

    const roomName = `transfer-${Date.now()}`
    await createRoomViaUi(hostPage, { name: roomName, maxPlayers: 2 })
    await joinRoomViaLobby(guestPage, roomName)
    await expect(hostPage.getByText('[2/2]')).toBeVisible({ timeout: 10_000 })

    await hostPage.getByRole('button', { name: 'EMERGENCY EXIT' }).click()

    // 残った参加者(ゲスト)が新しいホストになり、開始ボタンが使えるようになる
    await expect(
      guestPage.getByRole('button', { name: /LAUNCH SEQUENCE|WAITING FOR ALL/ })
    ).toBeVisible({ timeout: 10_000 })
    await expect(guestPage.getByText('HOST', { exact: true })).toBeVisible()

    await hostContext.close()
    await guestContext.close()
  })
})

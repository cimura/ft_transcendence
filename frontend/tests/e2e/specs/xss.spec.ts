import { test, expect } from '@playwright/test'
import { makeTestUser } from '../helpers/users'
import { signUpViaUi } from '../helpers/auth'
import { createRoomViaUi, joinRoomViaLobby } from '../helpers/rooms'

const XSS_PAYLOAD = '<img src=x onerror="window.__xssFired = true">'

test.describe('ユーザー入力のエスケープ (XSS)', () => {
  test('ルームチャットに入力した HTML/スクリプトは実行されず、文字列として表示される', async ({
    browser,
  }) => {
    const hostContext = await browser.newContext()
    const guestContext = await browser.newContext()
    const hostPage = await hostContext.newPage()
    const guestPage = await guestContext.newPage()

    const dialogs: string[] = []
    hostPage.on('dialog', (dialog) => {
      dialogs.push(dialog.message())
      void dialog.dismiss()
    })

    const host = makeTestUser('xsshost')
    const guest = makeTestUser('xssguest')
    await signUpViaUi(hostPage, host)
    await signUpViaUi(guestPage, guest)

    const roomName = `xss-check-${Date.now()}`
    await createRoomViaUi(hostPage, { name: roomName, maxPlayers: 2 })
    await joinRoomViaLobby(guestPage, roomName)

    await guestPage.locator('#chat-message').fill(XSS_PAYLOAD)
    await guestPage.getByRole('button', { name: 'SEND' }).click()

    // ホスト側の画面にメッセージが「文字列として」届くのを待つ
    await expect(hostPage.getByText(XSS_PAYLOAD)).toBeVisible({
      timeout: 10_000,
    })

    // onerror ハンドラが実行されていれば window.__xssFired が立つ。実行されていないこと。
    const fired = await hostPage.evaluate(
      () => (window as unknown as { __xssFired?: boolean }).__xssFired
    )
    expect(fired).toBeFalsy()

    // ペイロードが実際の <img> タグとして DOM に注入されていないこと(文字列表示のみ)
    const injectedImg = hostPage.locator('img[src="x"]')
    await expect(injectedImg).toHaveCount(0)

    expect(dialogs).toEqual([])

    await hostContext.close()
    await guestContext.close()
  })

  test('ルーム名に入力した HTML/スクリプトはロビーで実行されず、文字列として表示される', async ({
    browser,
  }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    const dialogs: string[] = []
    page.on('dialog', (dialog) => {
      dialogs.push(dialog.message())
      void dialog.dismiss()
    })

    const user = makeTestUser('xssroom')
    await signUpViaUi(page, user)

    // ルーム名は 30 文字上限のため、ペイロードをその範囲に収める
    const roomName = '<img src=x onerror=alert(1)>'
    await createRoomViaUi(page, { name: roomName, maxPlayers: 2 })

    await page.goto('/lobby')
    // ルーム名は30文字上限のため一意なサフィックスを付けられず、過去のテスト実行が
    // 残した同名ルームと重複しうる。作成日時降順ソートのため自分のルームが先頭に
    // 来る想定で .first() を使う
    await expect(page.getByText(roomName).first()).toBeVisible()
    await expect(page.locator('img[src="x"]')).toHaveCount(0)

    expect(dialogs).toEqual([])
    await context.close()
  })
})

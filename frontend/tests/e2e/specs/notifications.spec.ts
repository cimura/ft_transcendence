import { test, expect } from '@playwright/test'
import { makeTestUser } from '../helpers/users'
import { signUpViaUi } from '../helpers/auth'
import { createRoomViaUi } from '../helpers/rooms'
import { becomeFriends } from '../helpers/friends'

test.describe('通知', () => {
  test('フレンド申請の通知バッジがリロード無しで増える', async ({
    browser,
  }) => {
    const contextA = await browser.newContext()
    const contextB = await browser.newContext()
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    const userA = makeTestUser('notif_a')
    const userB = makeTestUser('notif_b')
    await signUpViaUi(pageA, userA)
    await signUpViaUi(pageB, userB)

    // B はホーム画面を開いたまま待機する(useRealtimeSocket が接続済み)
    await pageB.goto('/home')
    const notifNavButton = pageB.locator('button').filter({ hasText: 'ALERTS' })
    await expect(notifNavButton).toBeVisible()

    await pageA.goto('/friends/search')
    await pageA.getByPlaceholder('ユーザー名で検索...').fill(userB.username)
    await expect(pageA.getByText(userB.username)).toBeVisible({
      timeout: 10_000,
    })
    await pageA.getByRole('button', { name: 'フレンド申請' }).click()

    // リロードせずにバッジが 1 に増える
    await expect(notifNavButton.getByText('1', { exact: true })).toBeVisible({
      timeout: 10_000,
    })

    await notifNavButton.click()
    await expect(
      pageB.getByText(`${userA.username} からフレンド申請が届いています`)
    ).toBeVisible()
    await pageB.getByRole('button', { name: '承認' }).click()
    await expect(
      pageB.getByText(`${userA.username} からフレンド申請が届いています`)
    ).toHaveCount(0)

    await contextA.close()
    await contextB.close()
  })

  test('ルーム招待の通知から参加すると実際にそのルームへ入る', async ({
    browser,
  }) => {
    const contextA = await browser.newContext()
    const contextB = await browser.newContext()
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    const userA = makeTestUser('invite_a')
    const userB = makeTestUser('invite_b')
    await signUpViaUi(pageA, userA)
    await signUpViaUi(pageB, userB)

    await becomeFriends(pageA, pageB, userA.username, userB.username)

    const roomName = `invite-room-${Date.now()}`
    const roomId = await createRoomViaUi(pageA, {
      name: roomName,
      maxPlayers: 2,
    })

    await pageA.locator('select').selectOption({ label: userB.username })
    await pageA.getByRole('button', { name: '送信' }).click()
    await expect(pageA.getByText('通信リンクを送信しました')).toBeVisible({
      timeout: 10_000,
    })

    await pageB.goto('/notifications')
    await expect(
      pageB.getByText(`${userA.username} からルーム招待が届いています`)
    ).toBeVisible({ timeout: 10_000 })
    await pageB.getByRole('button', { name: '参加' }).click()

    await expect(pageB).toHaveURL(new RegExp(`/room/${roomId}$`))
    await expect(pageB.getByText(roomName)).toBeVisible()

    await contextA.close()
    await contextB.close()
  })
})

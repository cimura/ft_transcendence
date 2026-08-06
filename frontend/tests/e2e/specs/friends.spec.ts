import { test, expect } from '@playwright/test'
import { makeTestUser } from '../helpers/users'
import { signUpViaUi } from '../helpers/auth'
import { becomeFriends } from '../helpers/friends'

test.describe('フレンド機能', () => {
  test('ユーザー検索 → フレンド申請 → 通知から承認 → 一覧に反映 → 削除', async ({
    browser,
  }) => {
    const contextA = await browser.newContext()
    const contextB = await browser.newContext()
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    const userA = makeTestUser('social_a')
    const userB = makeTestUser('social_b')
    await signUpViaUi(pageA, userA)
    await signUpViaUi(pageB, userB)

    // 検索クエリは一意なユーザー名なので結果は1件のみ
    await pageA.goto('/friends/search')
    await pageA.getByPlaceholder('ユーザー名で検索...').fill(userB.username)
    await expect(pageA.getByText(userB.username)).toBeVisible({
      timeout: 10_000,
    })
    await pageA.getByRole('button', { name: 'フレンド申請' }).click()
    await expect(pageA.getByRole('button', { name: '申請中' })).toBeVisible()

    // B が通知から承認する
    await pageB.goto('/notifications')
    await expect(
      pageB.getByText(`${userA.username} からフレンド申請が届いています`)
    ).toBeVisible({ timeout: 10_000 })
    await pageB.getByRole('button', { name: '承認' }).click()

    // 双方のフレンド一覧に反映される
    await pageA.goto('/friends/list')
    await expect(pageA.getByText(userB.username)).toBeVisible({
      timeout: 10_000,
    })

    await pageB.goto('/friends/list')
    await expect(pageB.getByText(userA.username)).toBeVisible({
      timeout: 10_000,
    })

    // B が A のプロフィールへ遷移できる
    const friendLink = pageB.getByRole('link', {
      name: `${userA.username}のプロフィールを表示`,
    })
    await friendLink.click()
    await expect(pageB).toHaveURL(/\/profile\/.+/)
    await expect(pageB.getByText(userA.username).first()).toBeVisible()

    // B が A を削除する(削除ボタンはアイコンのみのため、フレンド行の親要素から辿る)
    await pageB.goto('/friends/list')
    const friendRow = pageB
      .getByRole('link', { name: `${userA.username}のプロフィールを表示` })
      .locator('xpath=..')
    await friendRow.getByRole('button').click()
    await pageB.getByRole('button', { name: 'はい' }).click()
    await expect(pageB.getByText('フレンドはいません')).toBeVisible({
      timeout: 10_000,
    })

    await contextA.close()
    await contextB.close()
  })

  test('フレンドのオンライン状態が表示される', async ({ browser }) => {
    const contextA = await browser.newContext()
    const contextB = await browser.newContext()
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    const userA = makeTestUser('presence_a')
    const userB = makeTestUser('presence_b')
    await signUpViaUi(pageA, userA)
    await signUpViaUi(pageB, userB)

    await becomeFriends(pageA, pageB, userA.username, userB.username)

    // 両者ともログイン中(ソケット接続中)なので、A から見た B は「オンライン」
    await pageA.goto('/friends/list')
    const friendRow = pageA
      .getByRole('link', { name: `${userB.username}のプロフィールを表示` })
      .locator('xpath=..')
    await expect(friendRow.getByText('オンライン')).toBeVisible({
      timeout: 10_000,
    })

    await contextA.close()
    await contextB.close()
  })
})

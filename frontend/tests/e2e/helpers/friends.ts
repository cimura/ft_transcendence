import { expect, type Page } from '@playwright/test'

/** A が B を検索してフレンド申請し、B が通知から承認するまでを一気に行う。 */
export async function becomeFriends(
  pageA: Page,
  pageB: Page,
  userA: string,
  userB: string
) {
  await pageA.goto('/friends/search')
  await pageA.getByPlaceholder('ユーザー名で検索...').fill(userB)
  await expect(pageA.getByText(userB)).toBeVisible({ timeout: 10_000 })
  await pageA.getByRole('button', { name: 'フレンド申請' }).click()

  await pageB.goto('/notifications')
  await expect(
    pageB.getByText(`${userA} からフレンド申請が届いています`)
  ).toBeVisible({ timeout: 10_000 })
  await pageB.getByRole('button', { name: '承認' }).click()
}

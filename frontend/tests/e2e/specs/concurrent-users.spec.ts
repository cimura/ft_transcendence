import { test, expect } from '@playwright/test'
import { makeTestUser } from '../helpers/users'
import { signUpViaUi } from '../helpers/auth'

test.describe('複数ユーザーの同時利用', () => {
  test('4人が同時にログインして別々の画面を操作しても破綻しない', async ({
    browser,
  }) => {
    const contexts = await Promise.all(
      Array.from({ length: 4 }, () => browser.newContext())
    )
    const pages = await Promise.all(contexts.map((ctx) => ctx.newPage()))
    const users = Array.from({ length: 4 }, (_, i) =>
      makeTestUser(`multi_${i}`)
    )

    await Promise.all(pages.map((page, i) => signUpViaUi(page, users[i])))
    await Promise.all(pages.map((page) => expect(page).toHaveURL(/\/home$/)))

    // それぞれ別の画面を同時に操作する(ロビー・ランキング・フレンド検索・設定)
    await Promise.all([
      pages[0].goto('/lobby'),
      pages[1].goto('/rankings'),
      pages[2].goto('/friends/search'),
      pages[3].goto('/settings'),
    ])

    await expect(
      pages[0].getByRole('button', { name: '+ CREATE ROOM' })
    ).toBeVisible()
    await expect(
      pages[1].getByRole('heading', { name: 'ランキング' })
    ).toBeVisible()
    await expect(pages[2].getByPlaceholder('ユーザー名で検索...')).toBeVisible()
    await expect(
      pages[3].getByRole('button', { name: 'アカウント管理' })
    ).toBeVisible()

    await Promise.all(contexts.map((ctx) => ctx.close()))
  })
})

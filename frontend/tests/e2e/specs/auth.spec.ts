import { test, expect } from '@playwright/test'
import { makeTestUser } from '../helpers/users'
import { signUpViaUi, signInViaUi, seedAccessToken } from '../helpers/auth'

test.describe('認証とルート保護', () => {
  test('サインアップ直後に自動的にログイン状態になる', async ({ page }) => {
    const user = makeTestUser('authflow')
    await signUpViaUi(page, user)
    await expect(page).toHaveURL(/\/home$/)
  })

  test('未ログインで保護ルートへアクセスするとサインイン画面へ誘導される', async ({
    page,
  }) => {
    await page.goto('/home')
    await expect(page).toHaveURL(/\/signin$/)

    await page.goto('/lobby')
    await expect(page).toHaveURL(/\/signin$/)
  })

  test('ログアウト後は保護ルートに入れない', async ({ page }) => {
    const user = makeTestUser('logout')
    await signUpViaUi(page, user)

    await page.goto('/settings')
    await page.getByRole('button', { name: 'ログアウト' }).click()
    await expect(page).toHaveURL(/\/signin$/)

    await page.goto('/home')
    await expect(page).toHaveURL(/\/signin$/)
  })

  test('改変されたトークンでは強制的にサインアウトされる', async ({ page }) => {
    await seedAccessToken(page, 'this.is.not-a-valid-signed-jwt')
    await page.goto('/home')

    // API が 401 を返し、axios の interceptor が forceSignOut する
    await expect(page).toHaveURL(/\/signin$/, { timeout: 10_000 })
  })

  test('パスワード変更後は新しいパスワードでのみログインできる', async ({
    page,
  }) => {
    const user = makeTestUser('pwchange')
    await signUpViaUi(page, user)

    const newPassword = 'BrandNewPassw0rd!'
    await page.goto('/settings/account')
    await page.getByRole('button', { name: 'パスワード変更' }).click()
    await page.locator('input[type="password"]').nth(0).fill(user.password)
    await page.locator('input[type="password"]').nth(1).fill(newPassword)
    await page.locator('input[type="password"]').nth(2).fill(newPassword)
    await page.getByRole('button', { name: '保存' }).click()
    await expect(page.getByText('パスワードを更新しました。')).toBeVisible()

    // ログアウトボタンは設定トップメニュー(/settings)にあり、サブメニュー(/settings/account)には無い
    await page.goto('/settings')
    await page.getByRole('button', { name: 'ログアウト' }).click()
    await expect(page).toHaveURL(/\/signin$/)

    // 旧パスワードはもう通らない
    await page.goto('/signin')
    await page.locator('#identifier').fill(user.username)
    await page.locator('#password').fill(user.password)
    await page.getByRole('button', { name: 'Enter System' }).click()
    await expect(
      page.getByText('ユーザー名、またはパスワードが正しくありません。')
    ).toBeVisible()

    // 新パスワードでログインできる
    await signInViaUi(page, { username: user.username, password: newPassword })
    await expect(page).toHaveURL(/\/home$/)
  })
})

import { test, expect } from '@playwright/test'
import { makeTestUser } from '../helpers/users'
import { signUpViaUi, loginAsNewUser } from '../helpers/auth'

test.describe('フォームのバリデーション', () => {
  test('サインアップ: パスワード不一致は送信されずエラーが出る', async ({
    page,
  }) => {
    const user = makeTestUser('mismatch')

    await page.goto('/signup')
    await page.locator('#email').fill(user.email)
    await page.locator('#username').fill(user.username)
    await page.locator('#password').fill(user.password)
    await page.locator('#confirmPassword').fill(`${user.password}x`)
    await page.getByRole('button', { name: 'Initialize Account' }).click()

    await expect(page.getByText('パスワードが一致しません。')).toBeVisible()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('サインアップ: 不正なユーザー名(記号)は送信されずエラーが出る', async ({
    page,
  }) => {
    const user = makeTestUser('badname')

    await page.goto('/signup')
    await page.locator('#email').fill(user.email)
    await page.locator('#username').fill('bad name!!')
    await page.locator('#password').fill(user.password)
    await page.locator('#confirmPassword').fill(user.password)
    await page.getByRole('button', { name: 'Initialize Account' }).click()

    await expect(
      page.getByText(
        'ユーザー名には英数字、アンダースコア、ハイフンのみ使用できます'
      )
    ).toBeVisible()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('サインアップ: 短すぎるパスワードはブラウザのネイティブ検証で止まる', async ({
    page,
  }) => {
    const user = makeTestUser('shortpw')

    await page.goto('/signup')
    await page.locator('#email').fill(user.email)
    await page.locator('#username').fill(user.username)
    await page.locator('#password').fill('short')
    await page.locator('#confirmPassword').fill('short')
    await page.getByRole('button', { name: 'Initialize Account' }).click()

    // HTML5 の minLength 制約により送信されない(URL が変わらない)
    await expect(page).toHaveURL(/\/signup$/)
    const isValid = await page
      .locator('#password')
      .evaluate((el: HTMLInputElement) => el.validity.valid)
    expect(isValid).toBe(false)
  })

  test('サインアップ: 既存メールアドレスでの重複登録が拒否される', async ({
    page,
  }) => {
    const user = makeTestUser('dup')
    await signUpViaUi(page, user)

    const other = makeTestUser('dup2')
    // signUpViaUi でログイン済みのままだと /signup は /home へリダイレクトされるため、
    // 一旦セッションを消してから改めて /signup を開く
    await page.evaluate(() => window.localStorage.clear())
    await page.goto('/signup')
    await page.locator('#email').fill(user.email) // 既存メール
    await page.locator('#username').fill(other.username)
    await page.locator('#password').fill(other.password)
    await page.locator('#confirmPassword').fill(other.password)
    await page.getByRole('button', { name: 'Initialize Account' }).click()

    await expect(
      page.getByText('このメールアドレスはすでに登録されています。')
    ).toBeVisible()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('サインイン: 誤ったパスワードは拒否される', async ({ page }) => {
    const user = makeTestUser('wrongpw')
    await signUpViaUi(page, user)

    // ログイン済みのままだと /signin は /home へリダイレクトされるため、セッションを消す
    await page.evaluate(() => window.localStorage.clear())
    await page.goto('/signin')
    await page.locator('#identifier').fill(user.username)
    await page.locator('#password').fill('completely-wrong-password')
    await page.getByRole('button', { name: 'Enter System' }).click()

    await expect(page).toHaveURL(/\/signin$/)
    await expect(
      page.getByText('ユーザー名、またはパスワードが正しくありません。')
    ).toBeVisible()
  })

  test('アカウント情報変更: 不正なメール形式が弾かれる', async ({
    page,
    request,
  }) => {
    await loginAsNewUser(page, request, 'acctval')

    await page.goto('/settings/account')
    await page.getByRole('button', { name: 'アカウント情報変更' }).click()

    const emailInput = page.locator('input[type="email"]')
    await emailInput.fill('not-an-email')
    await page.getByRole('button', { name: '保存' }).click()
    await expect(
      page.getByText('メールアドレスの形式が正しくありません。')
    ).toBeVisible()
  })

  test('パスワード変更: 新パスワードの不一致が弾かれる', async ({
    page,
    request,
  }) => {
    await loginAsNewUser(page, request, 'pwval')

    await page.goto('/settings/account')
    await page.getByRole('button', { name: 'パスワード変更' }).click()

    await page.locator('input[type="password"]').nth(0).fill('CurrentPassw0rd!')
    await page.locator('input[type="password"]').nth(1).fill('NewPassword123!')
    await page
      .locator('input[type="password"]')
      .nth(2)
      .fill('DifferentPassword!')
    await page.getByRole('button', { name: '保存' }).click()

    await expect(
      page.getByText('新しいパスワードが一致しません。')
    ).toBeVisible()
  })

  test('ルーム作成: 空の部屋名では作成できない', async ({ page, request }) => {
    await loginAsNewUser(page, request, 'roomval')

    await page.goto('/lobby')
    await page.getByRole('button', { name: '+ CREATE ROOM' }).click()
    await page.locator('#roomName').fill('   ')

    await expect(
      page.getByRole('button', { name: 'CREATE', exact: true })
    ).toBeDisabled()
  })
})

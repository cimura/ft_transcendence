import { test, expect } from '@playwright/test'
import { makeTestUser } from '../helpers/users'
import { signUpViaUi } from '../helpers/auth'

// 1x1 の透明 PNG (最小の有効な画像バイナリ)
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

test.describe('プロフィール編集', () => {
  test('ユーザー名変更が反映される', async ({ page }) => {
    const user = makeTestUser('editname')
    await signUpViaUi(page, user)

    await page.goto('/home')
    await page.getByText('マイプロフィール').click()
    await expect(page).toHaveURL(/\/profile\/.+/)

    await page.getByRole('button', { name: 'データ更新' }).click()
    const newUsername = `${user.username}_v2`.slice(0, 50)
    const usernameInput = page.locator('input[type="text"]').first()
    await usernameInput.fill(newUsername)
    await page.getByRole('button', { name: 'SAVE DATA' }).click()

    await expect(page.getByRole('heading', { name: newUsername })).toBeVisible({
      timeout: 10_000,
    })
  })

  test('デフォルトアバターを選択すると反映される', async ({ page }) => {
    const user = makeTestUser('defavatar')
    await signUpViaUi(page, user)

    await page.goto('/home')
    await page.getByText('マイプロフィール').click()
    await page.getByRole('button', { name: 'データ更新' }).click()

    await page.locator('img[src="/avatars/default-3.svg"]').click()
    await page.getByRole('button', { name: 'SAVE DATA' }).click()
    await expect(page.getByRole('button', { name: 'データ更新' })).toBeVisible({
      timeout: 10_000,
    })

    await expect(
      page.locator(`img[alt="${user.username}"]`).first()
    ).toHaveAttribute('src', '/avatars/default-3.svg')
  })

  test('カスタムアバター画像をアップロードすると反映される', async ({
    page,
  }) => {
    const user = makeTestUser('uploadavatar')
    await signUpViaUi(page, user)

    await page.goto('/home')
    await page.getByText('マイプロフィール').click()
    await page.getByRole('button', { name: 'データ更新' }).click()

    await page.locator('input[type="file"]').setInputFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: Buffer.from(TINY_PNG_BASE64, 'base64'),
    })
    await page.getByRole('button', { name: 'SAVE DATA' }).click()
    await expect(page.getByRole('button', { name: 'データ更新' })).toBeVisible({
      timeout: 10_000,
    })

    await expect(
      page.locator(`img[alt="${user.username}"]`).first()
    ).toHaveAttribute('src', /\/uploads\//)
  })

  test('許可されていない拡張子・5MB超のファイルはクライアント側で拒否される', async ({
    page,
  }) => {
    const user = makeTestUser('badavatar')
    await signUpViaUi(page, user)

    await page.goto('/home')
    await page.getByText('マイプロフィール').click()
    await page.getByRole('button', { name: 'データ更新' }).click()

    const fileInput = page.locator('input[type="file"]')

    // 許可されていない拡張子(text/plain)
    await fileInput.setInputFiles({
      name: 'not-an-image.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('this is not an image'),
    })
    await expect(
      page.getByText('JPEG、PNG、WebP形式のみ対応しています')
    ).toBeVisible()

    // 5MB を超えるファイル
    await fileInput.setInputFiles({
      name: 'too-big.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(6 * 1024 * 1024, 1),
    })
    await expect(
      page.getByText('ファイルサイズは5MB以下にしてください')
    ).toBeVisible()
  })
})

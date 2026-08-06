import { test, expect, type Page } from '@playwright/test'
import { loginAsNewUser } from '../helpers/auth'

const MIN_SECTION_COUNT = 3
const MIN_BODY_LENGTH = 300

async function assertSubstantiveLegalPage(page: Page, expectedTitle: string) {
  await expect(page.getByRole('heading', { name: expectedTitle })).toBeVisible()

  // プレースホルダ/空ページでないことを、見出し数と本文の分量で確認する
  const sectionHeadings = page.locator('article h2')
  await expect(sectionHeadings).not.toHaveCount(0)
  expect(await sectionHeadings.count()).toBeGreaterThanOrEqual(
    MIN_SECTION_COUNT
  )

  const bodyText = (await page.locator('article').innerText()).trim()
  expect(bodyText.length).toBeGreaterThan(MIN_BODY_LENGTH)

  await expect(page.getByText('最終更新日：')).toBeVisible()
}

test.describe('法務ページ', () => {
  test('サインイン画面のフッターから両ページへ到達でき、内容が実体を持つ', async ({
    page,
  }) => {
    await page.goto('/signin')
    const nav = page.getByRole('navigation', { name: '法務情報' })
    await expect(nav).toBeVisible()

    await nav.getByRole('link', { name: 'プライバシーポリシー' }).click()
    await expect(page).toHaveURL(/\/legal\/privacy-policy$/)
    await assertSubstantiveLegalPage(page, 'プライバシーポリシー')

    await page.goto('/signin')
    await page
      .getByRole('navigation', { name: '法務情報' })
      .getByRole('link', { name: '利用規約' })
      .click()
    await expect(page).toHaveURL(/\/legal\/terms-of-service$/)
    await assertSubstantiveLegalPage(page, '利用規約')
  })

  test('設定メニューからも法務ページへ到達できる(ログイン後)', async ({
    page,
    request,
  }) => {
    await loginAsNewUser(page, request, 'legaluser')
    await page.goto('/settings')

    await page
      .getByRole('navigation', { name: '法務情報' })
      .getByRole('link', { name: 'プライバシーポリシー' })
      .click()
    await expect(page).toHaveURL(/\/legal\/privacy-policy$/)
  })

  test('旧パスからのリダイレクトが機能する', async ({ page }) => {
    await page.goto('/privacy-policy')
    await expect(page).toHaveURL(/\/legal\/privacy-policy$/)

    await page.goto('/terms-of-service')
    await expect(page).toHaveURL(/\/legal\/terms-of-service$/)
  })

  test('法務ページから「アプリに戻る」でアプリに戻れる', async ({ page }) => {
    await page.goto('/legal/privacy-policy')
    await page.getByRole('link', { name: 'アプリに戻る' }).click()
    await expect(page).not.toHaveURL(/\/legal\//)
  })
})

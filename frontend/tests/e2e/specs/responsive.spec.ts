import { test, expect, type Page } from '@playwright/test'
import { loginAsNewUser } from '../helpers/auth'

const VIEWPORTS = [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 667 },
] as const

// スクロールバー幅等の丸め誤差を吸収する許容値
const SCROLL_TOLERANCE_PX = 2

async function assertNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  expect(
    overflow.scrollWidth,
    `horizontal overflow: scrollWidth=${overflow.scrollWidth} clientWidth=${overflow.clientWidth}`
  ).toBeLessThanOrEqual(overflow.clientWidth + SCROLL_TOLERANCE_PX)
}

test.describe('レスポンシブ表示', () => {
  for (const viewport of VIEWPORTS) {
    test(`未ログイン画面が ${viewport.name} (${viewport.width}x${viewport.height}) で崩れない`, async ({
      page,
    }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      })

      await page.goto('/signin')
      await expect(
        page.getByRole('button', { name: 'Enter System' })
      ).toBeVisible()
      await assertNoHorizontalScroll(page)
      await page.screenshot({
        path: `test-results/responsive/${viewport.name}-signin.png`,
      })

      await page.goto('/signup')
      await expect(
        page.getByRole('button', { name: 'Initialize Account' })
      ).toBeVisible()
      await assertNoHorizontalScroll(page)
    })

    test(`ログイン後の主要画面が ${viewport.name} (${viewport.width}x${viewport.height}) で崩れない`, async ({
      page,
      request,
    }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      })

      await loginAsNewUser(page, request, `resp-${viewport.name}`)

      await page.goto('/home')
      const startButton = page.getByText('対戦開始')
      await expect(startButton).toBeVisible()
      await expect(startButton).toBeInViewport()
      await assertNoHorizontalScroll(page)
      await page.screenshot({
        path: `test-results/responsive/${viewport.name}-home.png`,
      })

      await page.goto('/lobby')
      await expect(
        page.getByRole('button', { name: '+ CREATE ROOM' })
      ).toBeVisible()
      await assertNoHorizontalScroll(page)

      await page.goto('/home')
      await page.getByText('マイプロフィール').click()
      await expect(page).toHaveURL(/\/profile\/.+/)
      await assertNoHorizontalScroll(page)
      await page.screenshot({
        path: `test-results/responsive/${viewport.name}-profile.png`,
      })
    })
  }
})

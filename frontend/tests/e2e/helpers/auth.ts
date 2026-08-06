import { expect, type APIRequestContext, type Page } from '@playwright/test'
import { makeTestUser, type TestUser } from './users'

/** UI からサインアップし、/home への遷移まで待つ。フォームの実バリデーション経路を通したいテスト用。 */
export async function signUpViaUi(page: Page, user: TestUser) {
  await page.goto('/signup')
  await page.locator('#email').fill(user.email)
  await page.locator('#username').fill(user.username)
  await page.locator('#password').fill(user.password)
  await page.locator('#confirmPassword').fill(user.password)
  await page.getByRole('button', { name: 'Initialize Account' }).click()
  await page.waitForURL('**/home')
}

/** UI からサインインし、/home への遷移まで待つ。 */
export async function signInViaUi(
  page: Page,
  user: Pick<TestUser, 'username' | 'password'>
) {
  await page.goto('/signin')
  await page.locator('#identifier').fill(user.username)
  await page.locator('#password').fill(user.password)
  await page.getByRole('button', { name: 'Enter System' }).click()
  await page.waitForURL('**/home')
}

interface SignUpApiResult {
  id: string
  accessToken: string
}

/** API を直叩きしてサインアップする(UI 操作が本題でない検証を高速化する用)。 */
async function signUpViaApi(
  request: APIRequestContext,
  user: TestUser
): Promise<SignUpApiResult> {
  const response = await request.post('/api/auth/signup', {
    data: {
      email: user.email,
      username: user.username,
      password: user.password,
    },
  })
  expect(
    response.ok(),
    `signup failed: ${response.status()} ${await response.text()}`
  ).toBeTruthy()
  return response.json()
}

/**
 * accessToken を localStorage に注入して認証済み状態を作る(authStore の永続化キーに合わせる)。
 * ページ遷移前に呼ぶこと。注入後に navigate すると起動直後の verifySession が走り、
 * authStatus が 'authenticated' になってから画面が描画される。
 */
export async function seedAccessToken(page: Page, accessToken: string) {
  await page.addInitScript((token) => {
    window.localStorage.setItem('accessToken', token)
  }, accessToken)
}

/** API 経由でサインアップし、そのままそのページを認証済み状態にする。 */
export async function loginAsNewUser(
  page: Page,
  request: APIRequestContext,
  label = 'user'
) {
  const user = makeTestUser(label)
  const result = await signUpViaApi(request, user)
  await seedAccessToken(page, result.accessToken)
  return { user, ...result }
}

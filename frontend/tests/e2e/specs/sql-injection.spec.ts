import { test, expect } from '@playwright/test'
import { makeTestUser } from '../helpers/users'
import { signUpViaUi, signInViaUi } from '../helpers/auth'
import { createRoomViaUi, joinRoomViaLobby } from '../helpers/rooms'
import {
  DESTRUCTIVE_SQLI_PAYLOADS,
  EMAIL_SQLI_PAYLOAD,
  SHORT_SQLI_PAYLOADS,
  SQLI_PAYLOADS,
} from '../helpers/payloads'

const AUTH_ERROR = 'ユーザー名、またはパスワードが正しくありません。'

test.describe('SQL インジェクションへの耐性', () => {
  test('SignIn 画面: 識別子への SQL インジェクションで認証を突破できない', async ({
    page,
  }) => {
    test.setTimeout(90_000)

    const victim = makeTestUser('sqli_victim')
    await signUpViaUi(page, victim)
    // サインアップ直後はログイン済みで /signin が /home へ流されるため、セッションを消す
    await page.evaluate(() => window.localStorage.clear())

    for (const payload of SQLI_PAYLOADS) {
      await page.goto('/signin')
      await page.locator('#identifier').fill(payload)
      await page.locator('#password').fill('AnyPassword123!')
      await page.getByRole('button', { name: 'Enter System' }).click()

      await expect(page.getByText(AUTH_ERROR)).toBeVisible()
      await expect(page).toHaveURL(/\/signin$/)
    }

    // 実在するユーザー名にコメントアウトを足して、パスワード照合を飛ばそうとしても失敗する
    for (const suffix of ["' --", "' OR '1'='1", "'/*"]) {
      await page.goto('/signin')
      await page.locator('#identifier').fill(`${victim.username}${suffix}`)
      await page.locator('#password').fill('definitely-wrong-password')
      await page.getByRole('button', { name: 'Enter System' }).click()

      await expect(page.getByText(AUTH_ERROR)).toBeVisible()
      await expect(page).toHaveURL(/\/signin$/)
    }

    // 正しい資格情報なら従来どおり入れる(テストが常に失敗しているだけでない確認)
    await signInViaUi(page, victim)
    await expect(page).toHaveURL(/\/home$/)
  })

  test('SignUp 画面: ユーザー名への SQL インジェクションが弾かれる', async ({
    page,
  }) => {
    const user = makeTestUser('sqli_signup')

    await page.goto('/signup')

    for (const payload of SQLI_PAYLOADS) {
      await page.locator('#email').fill(user.email)
      await page.locator('#username').fill(payload)
      await page.locator('#password').fill(user.password)
      await page.locator('#confirmPassword').fill(user.password)
      await page.getByRole('button', { name: 'Initialize Account' }).click()

      await expect(
        page.getByText(
          'ユーザー名には英数字、アンダースコア、ハイフンのみ使用できます'
        )
      ).toBeVisible()
      await expect(page).toHaveURL(/\/signup$/)
    }

    // アカウントは 1 つも作られていない
    await page.goto('/signin')
    await page.locator('#identifier').fill(SQLI_PAYLOADS[0])
    await page.locator('#password').fill(user.password)
    await page.getByRole('button', { name: 'Enter System' }).click()
    await expect(page.getByText(AUTH_ERROR)).toBeVisible()
  })

  test('Room 内 Chat: SQL インジェクションが文字列として扱われる', async ({
    browser,
  }) => {
    const victimContext = await browser.newContext()
    const attackerContext = await browser.newContext()
    const victimPage = await victimContext.newPage()
    const attackerPage = await attackerContext.newPage()

    await signUpViaUi(victimPage, makeTestUser('sqli_chat_victim'))
    await signUpViaUi(attackerPage, makeTestUser('sqli_chat_attacker'))

    const roomName = `sqli-chat-${Date.now()}`
    await createRoomViaUi(victimPage, { name: roomName, maxPlayers: 2 })
    await joinRoomViaLobby(attackerPage, roomName)

    for (const payload of SQLI_PAYLOADS) {
      await attackerPage.locator('#chat-message').fill(payload)
      await attackerPage.getByRole('button', { name: 'SEND' }).click()

      // クエリの一部として解釈されず、そのままの文字列として保存・配信される
      await expect(victimPage.getByText(payload).first()).toBeVisible({
        timeout: 10_000,
      })
    }

    // 破壊的なペイロードを流し込んだ後もチャットは動き続ける
    const canary = `canary-${Date.now()}`
    await attackerPage.locator('#chat-message').fill(canary)
    await attackerPage.getByRole('button', { name: 'SEND' }).click()
    await expect(victimPage.getByText(canary)).toBeVisible({ timeout: 10_000 })

    await victimContext.close()
    await attackerContext.close()
  })

  test('プロフィール編集・設定画面: ユーザー名とメールへの SQL インジェクションが拒否される', async ({
    page,
  }) => {
    const user = makeTestUser('sqli_profile')
    await signUpViaUi(page, user)

    // プロフィール編集モーダル(クライアント側チェック無し → サーバの @Matches が拒否)
    await page.goto('/home')
    await page.getByText('マイプロフィール').click()
    await expect(page).toHaveURL(/\/profile\/.+/)
    await page.getByRole('button', { name: 'データ更新' }).click()

    const profileUsernameInput = page.locator('input[type="text"]').first()
    for (const payload of SQLI_PAYLOADS) {
      await profileUsernameInput.fill(payload)
      await page.getByRole('button', { name: 'SAVE DATA' }).click()
      await expect(page.getByText('入力内容を確認してください。')).toBeVisible({
        timeout: 10_000,
      })
    }
    await page.getByRole('button', { name: 'CANCEL' }).click()
    await expect(
      page.getByRole('heading', { name: user.username })
    ).toBeVisible()

    // 設定 > アカウント情報変更(クライアント側チェックで弾かれる)
    await page.goto('/settings/account')
    await page.getByRole('button', { name: 'アカウント情報変更' }).click()

    const emailInput = page.locator('input[type="email"]')
    const usernameInput = page.locator('input[type="text"]')

    for (const payload of SQLI_PAYLOADS) {
      await usernameInput.fill(payload)
      await page.getByRole('button', { name: '保存' }).click()
      await expect(
        page.getByText(
          'ユーザー名は英数字、アンダースコア、ハイフンのみ使用できます。'
        )
      ).toBeVisible()
    }

    // クライアント側のメール形式チェックをすり抜けても、サーバの @IsEmail() が拒否する
    await usernameInput.fill(user.username)
    await emailInput.fill(EMAIL_SQLI_PAYLOAD)
    await page.getByRole('button', { name: '保存' }).click()
    await expect(page.getByText('入力内容を確認してください。')).toBeVisible({
      timeout: 10_000,
    })
  })

  test('Room 作成モーダル: ルーム名の SQL インジェクションが文字列として扱われる', async ({
    browser,
  }) => {
    test.setTimeout(90_000)

    const victimContext = await browser.newContext()
    const victimPage = await victimContext.newPage()
    await signUpViaUi(victimPage, makeTestUser('sqli_lobby_victim'))

    for (const payload of SHORT_SQLI_PAYLOADS) {
      const attackerContext = await browser.newContext()
      const attackerPage = await attackerContext.newPage()
      await signUpViaUi(attackerPage, makeTestUser('sqli_room'))

      await createRoomViaUi(attackerPage, { name: payload, maxPlayers: 2 })
      await expect(attackerPage.getByText(payload).first()).toBeVisible()

      // 他ユーザーのロビー一覧も壊れず、ルーム名がそのまま表示される
      await victimPage.goto('/lobby')
      await expect(victimPage.getByText(payload).first()).toBeVisible({
        timeout: 10_000,
      })
      await expect(
        victimPage.getByRole('button', { name: '+ CREATE ROOM' })
      ).toBeVisible()

      await attackerContext.close()
    }

    await victimContext.close()
  })

  test('破壊的なペイロードを送った後もサインアップ・サインイン・ロビーが動作する', async ({
    browser,
  }) => {
    test.setTimeout(120_000)

    const context = await browser.newContext()
    const page = await context.newPage()

    const attacker = makeTestUser('sqli_destructive')
    await signUpViaUi(page, attacker)
    await page.evaluate(() => window.localStorage.clear())

    // 1. サインインの識別子として流し込む
    for (const payload of DESTRUCTIVE_SQLI_PAYLOADS) {
      await page.goto('/signin')
      await page.locator('#identifier').fill(payload)
      await page.locator('#password').fill('AnyPassword123!')
      await page.getByRole('button', { name: 'Enter System' }).click()
      await expect(page.getByText(AUTH_ERROR)).toBeVisible()
    }

    // 2. ルーム名とチャットとして流し込む
    await signInViaUi(page, attacker)
    await createRoomViaUi(page, {
      name: SHORT_SQLI_PAYLOADS[1],
      maxPlayers: 2,
    })
    for (const payload of DESTRUCTIVE_SQLI_PAYLOADS) {
      await page.locator('#chat-message').fill(payload)
      await page.getByRole('button', { name: 'SEND' }).click()
      await expect(page.getByText(payload).first()).toBeVisible({
        timeout: 10_000,
      })
    }
    await context.close()

    // 3. User テーブルが健在であること: 攻撃前に作ったアカウントで再びログインできる
    const survivorContext = await browser.newContext()
    const survivorPage = await survivorContext.newPage()
    await signInViaUi(survivorPage, attacker)
    await expect(survivorPage).toHaveURL(/\/home$/)

    // 4. 新規登録も引き続き通り、ロビーも表示できる
    const newcomerContext = await browser.newContext()
    const newcomerPage = await newcomerContext.newPage()
    await signUpViaUi(newcomerPage, makeTestUser('sqli_newcomer'))
    await newcomerPage.goto('/lobby')
    await expect(
      newcomerPage.getByRole('button', { name: '+ CREATE ROOM' })
    ).toBeVisible()

    await survivorContext.close()
    await newcomerContext.close()
  })
})

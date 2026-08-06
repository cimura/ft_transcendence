import { test, expect } from '@playwright/test'
import { makeTestUser } from '../helpers/users'
import { signUpViaUi } from '../helpers/auth'
import { createRoomViaUi, joinRoomViaLobby } from '../helpers/rooms'
import {
  attachXssProbe,
  EMAIL_XSS_PAYLOAD,
  SHORT_XSS_PAYLOADS,
  XSS_PAYLOADS,
} from '../helpers/payloads'

test.describe('XSS 攻撃への耐性', () => {
  test('SignUp 画面: ユーザー名・メールアドレスに仕込んだスクリプトが実行されない', async ({
    page,
  }) => {
    const probe = attachXssProbe(page)
    const user = makeTestUser('xss_signup')

    await page.goto('/signup')

    for (const payload of XSS_PAYLOADS) {
      await page.locator('#email').fill(user.email)
      await page.locator('#username').fill(payload)
      await page.locator('#password').fill(user.password)
      await page.locator('#confirmPassword').fill(user.password)
      await page.getByRole('button', { name: 'Initialize Account' }).click()

      // クライアント側の文字種チェックで送信前に弾かれる
      await expect(
        page.getByText(
          'ユーザー名には英数字、アンダースコア、ハイフンのみ使用できます'
        )
      ).toBeVisible()
      await expect(page).toHaveURL(/\/signup$/)
      await probe.assertNotExecuted(`signup username: ${payload}`)
    }

    // メールアドレス欄は type="email" のため、ブラウザのネイティブ検証で送信が止まる
    await page.locator('#email').fill(XSS_PAYLOADS[0])
    await page.locator('#username').fill(user.username)
    await page.getByRole('button', { name: 'Initialize Account' }).click()

    await expect(page).toHaveURL(/\/signup$/)
    const emailIsValid = await page
      .locator('#email')
      .evaluate((el: HTMLInputElement) => el.validity.valid)
    expect(emailIsValid).toBe(false)
    await probe.assertNotExecuted('signup email')
  })

  test('SignIn 画面: 識別子に仕込んだスクリプトが実行されない', async ({
    page,
  }) => {
    const probe = attachXssProbe(page)

    await page.goto('/signin')

    for (const payload of XSS_PAYLOADS) {
      await page.locator('#identifier').fill(payload)
      await page.locator('#password').fill('Irrelevant123!')
      await page.getByRole('button', { name: 'Enter System' }).click()

      // 該当ユーザーが存在せず 401。エラー表示は入力値を含まない固定文言。
      await expect(
        page.getByText('ユーザー名、またはパスワードが正しくありません。')
      ).toBeVisible()
      await expect(page).toHaveURL(/\/signin$/)
      await probe.assertNotExecuted(`signin identifier: ${payload}`)
    }
  })

  test('Room 内 Chat: 投稿したスクリプトが相手の画面でも文字列として表示される', async ({
    browser,
  }) => {
    test.setTimeout(90_000)

    const victimContext = await browser.newContext()
    const attackerContext = await browser.newContext()
    const victimPage = await victimContext.newPage()
    const attackerPage = await attackerContext.newPage()

    const victimProbe = attachXssProbe(victimPage)
    const attackerProbe = attachXssProbe(attackerPage)

    await signUpViaUi(victimPage, makeTestUser('xss_chat_victim'))
    await signUpViaUi(attackerPage, makeTestUser('xss_chat_attacker'))

    const roomName = `xss-chat-${Date.now()}`
    await createRoomViaUi(victimPage, { name: roomName, maxPlayers: 2 })
    await joinRoomViaLobby(attackerPage, roomName)

    for (const payload of XSS_PAYLOADS) {
      await attackerPage.locator('#chat-message').fill(payload)
      await attackerPage.getByRole('button', { name: 'SEND' }).click()

      // 受信側の画面に「文字列そのまま」届く = エスケープされている
      await expect(victimPage.getByText(payload).first()).toBeVisible({
        timeout: 10_000,
      })
      await victimProbe.assertNotExecuted(`chat (受信側): ${payload}`)
      await attackerProbe.assertNotExecuted(`chat (送信側): ${payload}`)
    }

    await victimContext.close()
    await attackerContext.close()
  })

  test('プロフィール編集: ユーザー名のスクリプトがサーバに拒否され、実行もされない', async ({
    page,
  }) => {
    const probe = attachXssProbe(page)
    const user = makeTestUser('xss_profile')
    await signUpViaUi(page, user)

    await page.goto('/home')
    await page.getByText('マイプロフィール').click()
    await expect(page).toHaveURL(/\/profile\/.+/)
    await page.getByRole('button', { name: 'データ更新' }).click()

    const usernameInput = page.locator('input[type="text"]').first()

    for (const payload of XSS_PAYLOADS) {
      await usernameInput.fill(payload)
      await page.getByRole('button', { name: 'SAVE DATA' }).click()

      // この画面にはクライアント側の文字種チェックが無いため、サーバの
      // UpdateUserDto (@Matches) が 400 を返して弾く
      await expect(page.getByText('入力内容を確認してください。')).toBeVisible({
        timeout: 10_000,
      })
      await probe.assertNotExecuted(`profile username: ${payload}`)
    }

    // ユーザー名は書き換わっていない
    await page.getByRole('button', { name: 'CANCEL' }).click()
    await expect(
      page.getByRole('heading', { name: user.username })
    ).toBeVisible()
  })

  test('設定のアカウント情報変更: メール・ユーザー名のスクリプトが拒否される', async ({
    page,
  }) => {
    const probe = attachXssProbe(page)
    const user = makeTestUser('xss_account')
    await signUpViaUi(page, user)

    await page.goto('/settings/account')
    await page.getByRole('button', { name: 'アカウント情報変更' }).click()

    const emailInput = page.locator('input[type="email"]')
    const usernameInput = page.locator('input[type="text"]')

    for (const payload of XSS_PAYLOADS) {
      await usernameInput.fill(payload)
      await page.getByRole('button', { name: '保存' }).click()

      await expect(
        page.getByText(
          'ユーザー名は英数字、アンダースコア、ハイフンのみ使用できます。'
        )
      ).toBeVisible()
      await probe.assertNotExecuted(`account username: ${payload}`)
    }

    // クライアント側のメール形式チェックをすり抜けるペイロードも、
    // サーバの @IsEmail() が 400 で拒否する
    await usernameInput.fill(user.username)
    await emailInput.fill(EMAIL_XSS_PAYLOAD)
    await page.getByRole('button', { name: '保存' }).click()

    await expect(page.getByText('入力内容を確認してください。')).toBeVisible({
      timeout: 10_000,
    })
    await probe.assertNotExecuted(`account email: ${EMAIL_XSS_PAYLOAD}`)
  })

  test('Room 作成モーダル: ルーム名のスクリプトが他ユーザーのロビーでも実行されない', async ({
    browser,
  }) => {
    test.setTimeout(120_000)

    const victimContext = await browser.newContext()
    const victimPage = await victimContext.newPage()
    const victimProbe = attachXssProbe(victimPage)
    await signUpViaUi(victimPage, makeTestUser('xss_lobby_victim'))

    for (const payload of SHORT_XSS_PAYLOADS) {
      // ルームに入ったままだとロビーへ行っても元のルームへ引き戻されるため、
      // ペイロードごとに別ユーザー(別コンテキスト)で作成する
      const attackerContext = await browser.newContext()
      const attackerPage = await attackerContext.newPage()
      const attackerProbe = attachXssProbe(attackerPage)
      await signUpViaUi(attackerPage, makeTestUser('xss_room'))

      await createRoomViaUi(attackerPage, { name: payload, maxPlayers: 2 })

      // 待機室のヘッダーに、ルーム名が文字列そのままで出る
      await expect(attackerPage.getByText(payload).first()).toBeVisible()
      await attackerProbe.assertNotExecuted(`room name (待機室): ${payload}`)

      // 他ユーザーのロビー一覧にも、文字列そのままで出る
      await victimPage.goto('/lobby')
      await expect(victimPage.getByText(payload).first()).toBeVisible({
        timeout: 10_000,
      })
      await victimProbe.assertNotExecuted(`room name (ロビー): ${payload}`)

      await attackerContext.close()
    }

    await victimContext.close()
  })
})

import { test, expect } from '@playwright/test'
import { makeTestUser } from '../helpers/users'
import { signUpViaUi } from '../helpers/auth'
import {
  createRoomViaUi,
  joinRoomViaLobby,
  setReady,
  startGame,
  retireFromGame,
} from '../helpers/rooms'

test.describe('戦績と対戦履歴', () => {
  test('試合結果がプロフィールの統計・履歴・ランキングに反映される', async ({
    browser,
    request,
  }) => {
    const hostContext = await browser.newContext()
    const guestContext = await browser.newContext()
    const hostPage = await hostContext.newPage()
    const guestPage = await guestContext.newPage()

    const host = makeTestUser('stats_host')
    const guest = makeTestUser('stats_guest')
    await signUpViaUi(hostPage, host)
    await signUpViaUi(guestPage, guest)

    const roomName = `stats-${Date.now()}`
    await createRoomViaUi(hostPage, { name: roomName, maxPlayers: 2 })
    await joinRoomViaLobby(guestPage, roomName)
    await setReady(guestPage)
    await startGame(hostPage, [guestPage])

    await expect(hostPage.getByText('生存 2')).toBeVisible({ timeout: 15_000 })

    // ゲストがリタイアし、ホストの勝利で試合を決定的に終局させる
    await retireFromGame(guestPage)
    await expect(hostPage.getByText('YOU WIN')).toBeVisible({ timeout: 10_000 })

    // 試合終了後は、ヘッダーと結果オーバーレイの両方に「ホームへ戻る」ボタンが存在するため、
    // 結果オーバーレイ側(<main> 内)に絞る
    await hostPage
      .getByRole('main')
      .getByRole('button', { name: 'ホームへ戻る' })
      .click()
    await hostPage.getByText('マイプロフィール').click()
    await expect(hostPage).toHaveURL(/\/profile\/.+/)

    await hostPage.getByRole('button', { name: '統計データ' }).click()
    await expect(hostPage.getByText('総試合数')).toBeVisible({
      timeout: 10_000,
    })
    const totalGamesCard = hostPage
      .locator('div')
      .filter({ hasText: '総試合数' })
      .last()
    // カードには値と同じ数字がアイコンにも出ることがあるため(例: 総試合数=1)、
    // 値を表示する <p> 要素に絞る
    await expect(totalGamesCard.locator('p')).toHaveText(/^[1-9]\d*$/)

    // 戦闘履歴タブ: 勝利した試合が記録されている
    await hostPage.getByRole('button', { name: '戦闘履歴' }).click()
    await expect(hostPage.getByText('勝利').first()).toBeVisible({
      timeout: 10_000,
    })
    await expect(hostPage.getByText(`vs ${guest.username}`)).toBeVisible()

    // 銀河ガイドタブ: 進行状況が描画される
    await hostPage.getByRole('button', { name: '銀河ガイド' }).click()
    await expect(hostPage.getByText(/^Level \d+$/)).toBeVisible({
      timeout: 10_000,
    })

    // ランキングページは上位20件のみ表示する固定仕様のため、繰り返しテストを実行して
    // 母数が増えた環境では自分が可視範囲外になりうる。「ランキングに反映されているか」
    // 自体は API を高い limit で叩いて確認する。
    await hostPage.goto('/rankings')
    await expect(
      hostPage.getByRole('heading', { name: 'ランキング' })
    ).toBeVisible()

    const accessToken = await hostPage.evaluate(() =>
      window.localStorage.getItem('accessToken')
    )
    expect(accessToken).toBeTruthy()
    const rankingsResponse = await request.get(
      '/api/scores/rankings?limit=100', // limit の上限
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    expect(rankingsResponse.ok()).toBeTruthy()
    const rankings = await rankingsResponse.json()
    expect(
      rankings.data.some(
        (item: { username: string }) => item.username === host.username
      )
    ).toBe(true)

    await hostContext.close()
    await guestContext.close()
  })
})

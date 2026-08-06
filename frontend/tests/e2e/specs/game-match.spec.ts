import { test, expect } from '@playwright/test'
import { makeTestUser } from '../helpers/users'
import { signUpViaUi } from '../helpers/auth'
import {
  createRoomViaUi,
  joinRoomViaLobby,
  setReady,
  startGame,
} from '../helpers/rooms'

// 爆弾の起爆までの時間(shared/game-constants.ts の BOMB_EXPLOSION_TIME_MS)。
// 設置後その場から動かなければ必ず自爆するので、決定的に勝敗を作れる。
const BOMB_EXPLOSION_TIME_MS = 3_000

// カウントダウンの長さ(shared/game-constants.ts の GAME_COUNTDOWN_SEC)。
// 「生存 2」は game:init 受信直後(まだ countdown フェーズ)から表示されるため、
// これだけでは playing フェーズに入った確証にならない。useGameInput.ts の
// handleCombinedInput は gamePhase !== 'playing' の間キー入力を黙って捨てるので、
// countdown 中に押すと bomb:place ごと消え、"YOU WIN" が永遠に出ずタイムアウトする。
const GAME_COUNTDOWN_MS = 5_000

test.describe('2人対戦', () => {
  test('対戦を開始し、実際に操作でき、勝敗が確定する', async ({ browser }) => {
    // 2人分のサインアップ・入室・カウントダウン・終局確認をフルスイート実行時の負荷下でも
    // 安定させるため、既定の60sでは足りないことがある
    test.setTimeout(90_000)

    const hostContext = await browser.newContext()
    const guestContext = await browser.newContext()
    const hostPage = await hostContext.newPage()
    const guestPage = await guestContext.newPage()

    const host = makeTestUser('match_host')
    const guest = makeTestUser('match_guest')
    await signUpViaUi(hostPage, host)
    await signUpViaUi(guestPage, guest)

    const roomName = `match-${Date.now()}`
    await createRoomViaUi(hostPage, { name: roomName, maxPlayers: 2 })
    await joinRoomViaLobby(guestPage, roomName)
    await setReady(guestPage)
    await startGame(hostPage, [guestPage])

    // ゲーム画面が描画される
    const hostCanvas = hostPage.locator('canvas')
    const guestCanvas = guestPage.locator('canvas')
    await expect(hostCanvas).toBeVisible({ timeout: 10_000 })
    await expect(guestCanvas).toBeVisible({ timeout: 10_000 })

    // game:init を受信した(まだ countdown フェーズ)ことの目安として生存人数表示を使う
    await expect(hostPage.getByText('生存 2')).toBeVisible({ timeout: 15_000 })

    // カウントダウンが終わり実際に playing フェーズへ入るまで待つ。ここで待たずに
    // キー入力すると countdown 中の入力として黙って捨てられる(上のコメント参照)。
    await hostPage.waitForTimeout(GAME_COUNTDOWN_MS + 1_000)

    // ホストは設置後その場から動かさず、必ず自爆させて試合を決定的に終局させる。
    // (guest 側の retire に頼ると、host が自分の爆弾で先に死んだ場合に
    // 「ホームへ戻る」ボタンがヘッダーと結果オーバーレイの2箇所にマッチして
    // strict mode 違反になる)
    await hostPage.keyboard.press('ArrowUp')
    await hostPage.keyboard.press('ArrowRight')
    await hostPage.keyboard.press('Space')
    // ゲストは爆風から離れる方向へ動かし、実際に操作できることも示す
    await guestPage.keyboard.press('ArrowDown')
    await guestPage.keyboard.press('ArrowLeft')

    await hostPage.screenshot({ path: 'test-results/game-screen-host.png' })
    await guestPage.screenshot({ path: 'test-results/game-screen-guest.png' })

    // 爆発を待つ(生存者1名になった時点で自然に終局する)。明示的な sleep は挟まず、
    // 爆発までの猶予を assertion のポーリング timeout に含める。
    await expect(guestPage.getByText('YOU WIN')).toBeVisible({
      timeout: BOMB_EXPLOSION_TIME_MS + 5_000,
    })
    await expect(guestPage.getByText('プレイヤー')).toBeVisible() // 集計テーブルのヘッダー
    // ユーザー名はプレイヤーラベル(3Dシーン上)とランキング表の両方に出るため、表側に絞る
    await expect(
      guestPage.getByRole('cell', { name: guest.username })
    ).toBeVisible()

    // 自爆したホストには敗北が表示される
    await expect(hostPage.getByText('GAME OVER')).toBeVisible({
      timeout: 10_000,
    })

    await hostContext.close()
    await guestContext.close()
  })
})

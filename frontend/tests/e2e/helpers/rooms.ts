import { expect, type Page } from '@playwright/test'

/** ロビーからルームを作成し、待機室(/room/:id)への遷移まで待って roomId を返す。 */
export async function createRoomViaUi(
  page: Page,
  options: { name: string; maxPlayers: 2 | 3 | 4 }
): Promise<string> {
  await page.goto('/lobby')
  await page.getByRole('button', { name: '+ CREATE ROOM' }).click()
  await page.locator('#roomName').fill(options.name)
  await page
    .getByRole('button', { name: String(options.maxPlayers), exact: true })
    .click()
  await page.getByRole('button', { name: 'CREATE', exact: true }).click()
  await page.waitForURL('**/room/**')

  const roomId = new URL(page.url()).pathname.split('/').pop()
  if (!roomId) throw new Error(`Failed to extract roomId from ${page.url()}`)
  return roomId
}

/** ロビーの一覧からルーム名でカードを探して JOIN する。 */
export async function joinRoomViaLobby(page: Page, roomName: string) {
  await page.goto('/lobby')
  const joinButton = page.getByRole('button', { name: 'JOIN' })
  const roomCard = page
    .locator('div')
    .filter({ hasText: roomName })
    .filter({ has: joinButton })
    .last()
  await expect(roomCard).toBeVisible({ timeout: 10_000 })
  await roomCard.getByRole('button', { name: 'JOIN' }).click()
  await page.waitForURL('**/room/**')
}

/** ゲスト(非ホスト)を Ready にする。ホストはルーム作成時から Ready 扱い。 */
export async function setReady(page: Page) {
  await page.getByRole('button', { name: /STANDBY/ }).click()
  await expect(
    page.getByRole('button', { name: 'READY TO LAUNCH' })
  ).toBeVisible()
}

/** ホストが試合を開始し、指定した全ゲストページも /game/:id への遷移まで待つ。 */
export async function startGame(hostPage: Page, guestPages: Page[] = []) {
  const startButton = hostPage.getByRole('button', {
    name: 'LAUNCH SEQUENCE INITIATE',
  })
  await expect(startButton).toBeEnabled({ timeout: 10_000 })
  await startButton.click()
  await Promise.all([
    hostPage.waitForURL('**/game/**'),
    ...guestPages.map((p) => p.waitForURL('**/game/**')),
  ])
}

/**
 * ゲーム画面から「ホームへ戻る」→ リタイア確定、で試合を終局させる。
 * 実プレイで撃破を狙うより決定的に試合結果を作れる。
 */
export async function retireFromGame(page: Page) {
  await page.getByRole('button', { name: 'ホームへ戻る' }).click()
  await page.getByRole('button', { name: 'はい' }).click()
}

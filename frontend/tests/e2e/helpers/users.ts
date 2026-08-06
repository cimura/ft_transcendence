import { randomUUID } from 'node:crypto'

export interface TestUser {
  username: string
  email: string
  password: string
}

/**
 * テストごとに一意なユーザーを作る。DB を掃除する仕組みは無いため、テスト同士や
 * 再実行の衝突を「名前を毎回一意にする」ことだけで避ける方針にしている。
 * ランキング等のアサーションも、この一意性を前提に「自分の行を探す」形にすること。
 */
export function makeTestUser(label = 'user'): TestUser {
  const id = randomUUID().replace(/-/g, '').slice(0, 10)
  const username = `${label}_${id}`.slice(0, 50)
  return {
    username,
    email: `${username}@example.com`,
    password: 'Password123!',
  }
}

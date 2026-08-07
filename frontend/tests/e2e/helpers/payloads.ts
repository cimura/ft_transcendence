import { expect, type Page } from '@playwright/test'

/**
 * XSS 用ペイロード。HTML として解釈された場合だけ `window.__xssFired` が立つように
 * 作ってある(スクリプトが実行されたことを、描画結果ではなく副作用で検知するため)。
 *
 * 長さは 50 文字以内に収めている。サインアップのユーザー名入力が maxLength=50 で、
 * これを超えるとブラウザのネイティブ検証で送信自体が止まり、
 * 「アプリがどう扱うか」を検証できなくなるため。
 */
export const XSS_PAYLOADS = [
  '<img src=x onerror="window.__xssFired=1">',
  '<svg onload="window.__xssFired=1">',
  '"><script>window.__xssFired=1</script>',
  '<a href="javascript:window.__xssFired=1">x</a>',
  "' onmouseover='window.__xssFired=1",
] as const

/**
 * ルーム名用の XSS ペイロード。CreateRoomDto.name が MaxLength(30) のため、
 * 30 文字を超えるものはサーバに届く前に 400 で弾かれてしまい、
 * 「保存された文字列がどう描画されるか」を検証できない。
 *
 * E2E テストはデータをクリーンアップしないため、固定文字列だと過去の実行で
 * 作成された同名ルームが `getByText` の一致対象になり得る(その場合、
 * 今回のルーム名が正しく保存・エスケープされていなくてもテストが通ってしまう)。
 * そのため呼び出しごとに一意な suffix (3 桁の数字) を埋め込む。
 * onerror/onload の引数はその suffix をそのまま使い、実行可能なペイロードのまま保つ。
 */
export function createShortXssPayloads(uniqueId: string) {
  return [
    `<img src=x onerror=alert(${uniqueId})>`,
    `<svg onload=alert(${uniqueId})>`,
    `"><b>${uniqueId}</b>`,
  ] as const
}

/** {@link createShortXssPayloads} 用の一意な 3 桁 suffix を生成する。 */
export function makeXssUniqueId() {
  return String(100 + Math.floor(Math.random() * 900))
}

/**
 * AccountInfoModal のクライアント側チェック(`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)を
 * 通過するペイロード。空白と余分な `@` を含まないため、この簡易な正規表現では
 * 弾けずサーバまで到達する。
 */
export const EMAIL_XSS_PAYLOAD =
  '<img/src=x/onerror="window.__xssFired=1">@evil.example.com'

/** 同上。SQL インジェクション版。 */
export const EMAIL_SQLI_PAYLOAD = "'OR'1'='1@evil.example.com"

export const SQLI_PAYLOADS = [
  "' OR '1'='1",
  "' OR 1=1 --",
  "admin' --",
  "' UNION SELECT NULL,NULL --",
  '\'; DROP TABLE "User"; --',
] as const

/** ルーム名(30 文字以内)に収まる SQL インジェクションペイロード。 */
export const SHORT_SQLI_PAYLOADS = [
  "' OR 1=1 --",
  '\'; DROP TABLE "User"; --',
] as const

/** 実行されればテーブルごと消える、破壊的なペイロード。 */
export const DESTRUCTIVE_SQLI_PAYLOADS = [
  '\'; DROP TABLE "User"; --',
  '\'; DELETE FROM "Room"; --',
  '1; TRUNCATE "User" CASCADE; --',
] as const

/**
 * ペイロードがスクリプトとして実行されていないことを検知するプローブ。
 *
 * 3 つの経路で見ている:
 * 1. `window.__xssFired` — インラインハンドラが動いたかどうか
 * 2. dialog — `alert()` 系が動いたかどうか
 * 3. DOM — ペイロードが文字列ではなく要素として組み立てられていないかどうか
 *
 * ページ遷移すると `window.__xssFired` はリセットされるため、
 * ペイロード投入と同じ画面のまま assert すること。
 */
export function attachXssProbe(page: Page) {
  const dialogs: string[] = []
  page.on('dialog', (dialog) => {
    dialogs.push(dialog.message())
    void dialog.dismiss()
  })

  return {
    async assertNotExecuted(context: string) {
      const fired = await page.evaluate(
        () => (window as unknown as { __xssFired?: unknown }).__xssFired
      )
      expect(fired, `ペイロードが実行された: ${context}`).toBeFalsy()
      expect(dialogs, `dialog が開いた: ${context}`).toEqual([])

      // React は文字列をテキストノードとして描画するため、これらのセレクタに
      // 一致する要素はアプリ側には存在しない。1 件でもあればペイロードが
      // HTML として組み立てられたことを意味する。
      const injected = await page.evaluate(
        () =>
          document.querySelectorAll(
            'img[src="x"], [onerror], [onload], [onmouseover], a[href^="javascript:"], iframe'
          ).length
      )
      expect(
        injected,
        `ペイロードが HTML として DOM に挿入された: ${context}`
      ).toBe(0)
    },
  }
}

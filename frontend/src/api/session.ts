/**
 * アクセストークン失効の検知と通知を、axios クライアントと authStore の間で
 * 疎結合に橋渡しするためのモジュール。
 *
 * client.ts が authStore を直接 import すると
 * client.ts -> authStore.ts -> api/auth.ts -> client.ts の循環 import になるため、
 * このモジュールだけを介してハンドラを登録/呼び出す。
 */

/** 認証切れが原因でリクエストが中断されたことを表す専用エラー。 */
export class SessionExpiredError extends Error {
  constructor() {
    super('SESSION_EXPIRED')
    this.name = 'SessionExpiredError'

    Object.setPrototypeOf(this, SessionExpiredError.prototype)
  }
}

export const isSessionExpiredError = (
  error: unknown
): error is SessionExpiredError => error instanceof SessionExpiredError

type SessionExpiredHandler = () => void

let sessionExpiredHandler: SessionExpiredHandler | null = null

/** authStore 側から、認証切れ検知時に実行するハンドラを登録する。 */
export const setSessionExpiredHandler = (handler: SessionExpiredHandler) => {
  sessionExpiredHandler = handler
}

/** アクセストークンが無効だと判明した箇所から呼び出す。 */
export const notifySessionExpired = () => {
  sessionExpiredHandler?.()
}

import axios from 'axios'
import { isSessionExpiredError } from './session'

type ApiErrorResponse = {
  code?: string
  message?: unknown
}

const apiErrorMessages: Record<string, string> = {
  NO_UPDATE_FIELDS: '変更内容を1つ以上入力してください。',
  EMAIL_ALREADY_IN_USE: 'このメールアドレスはすでに使われています。',
  USERNAME_ALREADY_IN_USE: 'このユーザー名はすでに使われています。',
  CURRENT_PASSWORD_REQUIRED: '現在のパスワードを入力してください。',
  CURRENT_PASSWORD_INVALID: '現在のパスワードが正しくありません。',
  USER_NOT_FOUND: 'ユーザーが見つかりません。',
  ROOM_INVITATION_NO_LONGER_ALLOWED:
    'フレンド関係が解除されたため、この招待には参加できません。',
}

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  // 認証切れは強制サインアウトで無言遷移させるため、フォームにエラー文言を出さない
  if (isSessionExpiredError(error)) {
    return ''
  }

  if (!axios.isAxiosError(error)) {
    return fallback
  }

  const status = error.response?.status
  const data = error.response?.data as ApiErrorResponse | undefined

  if (data?.code && apiErrorMessages[data.code]) {
    return apiErrorMessages[data.code]
  }

  if (status === 400) {
    return '入力内容を確認してください。'
  }
  if (status === 401) {
    return '認証情報を確認してください。'
  }
  if (status === 403) {
    return 'この操作を実行する権限がありません。'
  }
  if (status === 404) {
    return '対象のデータが見つかりません。'
  }
  if (status === 409) {
    return '入力された情報はすでに使われています。'
  }

  return fallback
}

/**
 * console.error の代わりにこちらを使う。認証切れ(SessionExpiredError)は
 * 強制サインアウトによる正常な遷移なので、コンソールには何も出さない。
 */
export const logApiError = (context: string, error: unknown) => {
  if (isSessionExpiredError(error)) return

  // 操作に対する想定内の4xxは呼び出し元がUIへ表示するため、
  // DevTools上で未処理エラーのように見えるログを重ねて出さない。
  if (
    axios.isAxiosError(error) &&
    error.response &&
    error.response.status >= 400 &&
    error.response.status < 500
  ) {
    return
  }

  console.error(context, error)
}

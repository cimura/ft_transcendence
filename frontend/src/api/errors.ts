import axios from 'axios'

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
}

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError(error)) {
    return fallback
  }

  const status = error.response?.status
  const data = error.response?.data as ApiErrorResponse | undefined

  if (data?.code && apiErrorMessages[data.code]) {
    return apiErrorMessages[data.code]
  }

  if (typeof data?.message === 'string') {
    return data.message
  }

  if (Array.isArray(data?.message) && data.message.length > 0) {
    return data.message.join(' ')
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

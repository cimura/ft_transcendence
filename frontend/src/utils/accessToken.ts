const ACCESS_TOKEN_KEY = 'accessToken'

export const getStoredAccessToken = () => {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(ACCESS_TOKEN_KEY)
}

export const storeAccessToken = (token: string | null) => {
  if (typeof window === 'undefined') return

  // タブ単位の認証だった頃の値が残っていると混乱の元になるため掃除する
  window.sessionStorage.removeItem(ACCESS_TOKEN_KEY)

  if (token) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token)
  } else {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY)
  }
}

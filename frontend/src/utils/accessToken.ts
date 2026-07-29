const ACCESS_TOKEN_KEY = 'accessToken'

export const getStoredAccessToken = () => {
  if (typeof window === 'undefined') return null
  return window.sessionStorage.getItem(ACCESS_TOKEN_KEY)
}

export const storeAccessToken = (token: string | null) => {
  if (typeof window === 'undefined') return

  // Authentication is tab-scoped so multiple local players can use separate
  // accounts in different tabs. Remove the legacy shared value as well.
  window.localStorage.removeItem(ACCESS_TOKEN_KEY)

  if (token) {
    window.sessionStorage.setItem(ACCESS_TOKEN_KEY, token)
  } else {
    window.sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  }
}

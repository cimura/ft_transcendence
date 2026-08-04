import axios from 'axios'
import { getStoredAccessToken } from '../utils/accessToken'
import { SessionExpiredError, notifySessionExpired } from './session'

// トークンを一切必要としないパス(JwtAuthGuard の対象外)。
// 常にトークン無しで叩き、Authorization ヘッダも付与しない。
const NO_AUTH_PATHS = ['/auth/signin', '/auth/signup']

const matchesPath = (url: string | undefined, paths: readonly string[]) => {
  if (!url) return false

  return paths.includes(new URL(url, 'http://localhost').pathname)
}

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  if (matchesPath(config.url, NO_AUTH_PATHS)) {
    return config
  }

  const accessToken = getStoredAccessToken()

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  return config
})

// アクセストークンが無効・期限切れの場合、バックエンドは 401 を返す。
// ここで検知して強制サインアウト(store側で accessToken を null にして SignIn へ)する。
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !matchesPath(error.config?.url, NO_AUTH_PATHS)
    ) {
      notifySessionExpired()
      return Promise.reject(new SessionExpiredError())
    }

    return Promise.reject(error)
  }
)

export default api

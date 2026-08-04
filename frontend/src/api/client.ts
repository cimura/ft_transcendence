import axios from 'axios'
import { getStoredAccessToken } from '../utils/accessToken'
import { SessionExpiredError, notifySessionExpired } from './session'

// トークンを一切必要としないパス(JwtAuthGuard の対象外)。
// 常にトークン無しで叩き、Authorization ヘッダも付与しない。
const NO_AUTH_PATHS = ['/auth/signin', '/auth/signup']

// トークンが「あれば付与するが、無くてもブロックしない」パス。
// GET /auth/session はトークンが無くても常に200 + {valid:false}を返す設計なので、
// 未保持の状態でも到達できる必要がある。
const OPTIONAL_AUTH_PATHS = ['/auth/session']

const matchesPath = (url: string | undefined, paths: string[]) =>
  Boolean(url && paths.some((path) => url.includes(path)))

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
    return config
  }

  if (matchesPath(config.url, OPTIONAL_AUTH_PATHS)) {
    return config
  }

  // トークンが無い(未保持)場合、どうせ401になるリクエストをそもそも送らない。
  // これにより devtools のコンソール/Networkにエラーを出さずに済む。
  notifySessionExpired()
  return Promise.reject(new SessionExpiredError())
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !matchesPath(error.config?.url, NO_AUTH_PATHS) &&
      !matchesPath(error.config?.url, OPTIONAL_AUTH_PATHS)
    ) {
      notifySessionExpired()
      return Promise.reject(new SessionExpiredError())
    }

    return Promise.reject(error)
  }
)

export default api

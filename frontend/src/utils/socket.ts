import {
  io,
  type ManagerOptions,
  type Socket,
  type SocketOptions,
} from 'socket.io-client'
import type { EventsMap } from '@socket.io/component-emitter'

const ORIGIN = (
  import.meta.env.VITE_BACKEND_URL || window.location.origin
).replace(/\/$/, '')

/**
 * namespace ごとに独立した接続(Manager)を作る。
 *
 * socket.io-client の `io()` は既定でオリジン単位に Manager をキャッシュし、
 * namespace はキャッシュキーに含まれない。そのため forceNew を渡さずに複数の
 * フックが同じオリジンへ接続すると、後から呼ばれた側は新しい接続を張らず
 * 既存の Manager に相乗りしてしまう。相乗りした場合:
 * - 先に接続した画面がアンマウントされて Manager が閉じる/再接続待ちになると、
 *   後発の namespace への CONNECT がエラーも出さず送られないまま止まる
 *   (/game で初回入室時にオブジェクトが表示されない不具合として発生した)
 * - この opts に渡した transports 等が無視される
 * ここでは forceNew を固定し、呼び出し側の意図どおりの接続を保証する。
 */
export function createSocket<
  ListenEvents extends EventsMap,
  EmitEvents extends EventsMap = ListenEvents,
>(
  namespace: string,
  accessToken: string,
  opts: Partial<ManagerOptions & SocketOptions> = {}
): Socket<ListenEvents, EmitEvents> {
  const socket = io(`${ORIGIN}${namespace}`, {
    forceNew: true,
    auth: { token: `Bearer ${accessToken}` },
    ...opts,
  })
  ensureNetworkListeners()
  managedSockets.add(socket)
  return socket
}

/**
 * オフラインになると Socket.IO は既定で再接続を延々と試み、ネットワーク層に
 * ブロックされた通信が net::ERR_INTERNET_DISCONNECTED としてコンソールに
 * 出続ける(try-catchでは消せない)。これを避けるため、ブラウザの online/offline
 * を検知して自前で接続/切断を制御する。
 *
 * createSocket() が生成した全ソケットをここで一元管理する
 * (forceNew: true のため Manager がソケットごとに独立しており、
 * ソケット単位でしか再接続を制御できない)。
 */
const managedSockets = new Set<Socket>()
const pausedSockets = new Set<Socket>()
let networkListenersRegistered = false

function ensureNetworkListeners() {
  if (networkListenersRegistered) return
  networkListenersRegistered = true

  window.addEventListener('offline', () => {
    for (const socket of managedSockets) {
      if (!socket.active) continue
      pausedSockets.add(socket)
      socket.disconnect()
    }
  })

  window.addEventListener('online', () => {
    for (const socket of pausedSockets) {
      if (managedSockets.has(socket)) {
        socket.connect()
      }
    }
    pausedSockets.clear()
  })
}

/** オフライン中は接続を保留し、無駄な再試行を発生させない。 */
export function connectSocket(socket: Socket) {
  if (!navigator.onLine) {
    pausedSockets.add(socket)
    return
  }
  socket.connect()
}

/** アンマウント時などの明示的な切断。オフライン復帰対象からも外す。 */
export function releaseSocket(socket: Socket) {
  managedSockets.delete(socket)
  pausedSockets.delete(socket)
  socket.disconnect()
}

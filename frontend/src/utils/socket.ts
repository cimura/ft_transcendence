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

let pageLifecycleBound = false

/**
 * bfcache (Back/Forward Cache) 対策。
 *
 * WebSocket を開いたままページが bfcache に入ると、ブラウザが安全のため
 * 強制的に切断し、コンソールに "Page entered Back-Forward Cache" エラーが
 * 出る。pagehide (bfcache 投入 / ドキュメント破棄の直前に発火) で先回りして
 * 明示的に切断すればこのエラーは出ない。
 *
 * ここでは room:leave / game:leave のようなドメインイベントは送らない。
 * pagehide はリロードでも発火するため、そこで明示的な退出扱いにすると
 * リロード時に部屋/ゲームから追い出されてしまう。リロードは一時切断として
 * バックエンドの猶予期間 (ROOMS_DISCONNECT_GRACE_MS 等) に委ねる設計を維持する。
 *
 * pageshow(persisted) は bfcache から復帰した合図。React は再マウントされない
 * ため、こちらで手動で繋ぎ直す。ただし復帰対象は pagehide 時点で実際に生きて
 * いた (socket.active な) ソケットだけに限る。明示的に disconnect() 済みの
 * ソケットや、まだ connectSocket() されていないソケットまで繋ぎ直すと、
 * 呼び出し側が終了させたはずの接続を勝手に張り直すことになる
 * (disconnect() は socket.io の自動再接続も止めるため、この経路は明確に意図に反する)。
 */
function bindPageLifecycleListeners() {
  if (pageLifecycleBound) return
  pageLifecycleBound = true

  window.addEventListener('pagehide', () => {
    bfcacheSuspendedSockets.clear()
    for (const socket of managedSockets) {
      if (!socket.active) continue
      bfcacheSuspendedSockets.add(socket)
      socket.disconnect()
    }
  })

  window.addEventListener('pageshow', (event: PageTransitionEvent) => {
    if (!event.persisted) return
    for (const socket of bfcacheSuspendedSockets) {
      if (managedSockets.has(socket)) {
        // オフライン中の復帰なら connectSocket 側で保留され、online で繋がる。
        connectSocket(socket)
      }
    }
    bfcacheSuspendedSockets.clear()
  })
}

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
  bindPageLifecycleListeners()

  const shouldAutoConnect = opts.autoConnect ?? true
  const socket = io(`${ORIGIN}${namespace}`, {
    forceNew: true,
    auth: { token: `Bearer ${accessToken}` },
    ...opts,
    autoConnect: false,
  })
  ensureNetworkListeners()
  managedSockets.add(socket)
  if (shouldAutoConnect) {
    connectSocket(socket)
  }
  return socket
}

const managedSockets = new Set<Socket>()
const pausedSockets = new Set<Socket>()
// pagehide の時点で生きていたソケット。bfcache 復帰時に繋ぎ直す対象を
// この記録に限定するために使う。
const bfcacheSuspendedSockets = new Set<Socket>()
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

/**
 * フックの cleanup から呼ぶ。生存ソケットレジストリから外してから切断する。
 *
 * アンマウント済みのソケットをレジストリに残したままにすると、bfcache 復帰時に
 * 既に破棄されたページのソケットまで connect() で蘇らせてしまうため、
 * disconnect() 単体ではなく必ずこちらを使うこと。オフライン復帰対象からも外す。
 */
export function releaseSocket(socket: Socket): void {
  managedSockets.delete(socket)
  pausedSockets.delete(socket)
  bfcacheSuspendedSockets.delete(socket)
  socket.disconnect()
}

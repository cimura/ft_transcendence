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

export function createSocket<
  ListenEvents extends EventsMap,
  EmitEvents extends EventsMap = ListenEvents,
>(
  namespace: string,
  accessToken: string,
  opts: Partial<ManagerOptions & SocketOptions> = {}
): Socket<ListenEvents, EmitEvents> {
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

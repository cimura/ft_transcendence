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
  return io(`${ORIGIN}${namespace}`, {
    forceNew: true,
    auth: { token: `Bearer ${accessToken}` },
    ...opts,
  })
}

import { DISCONNECT_TIMEOUT_MS } from '@ft_transcendence/shared/game-constants';
import type { Room } from '../types/room.type';

// ルームに(再)入室してよいかどうかの判定。GameService.handleGameJoin の入室許可判定と、
// ロビーからの自動復帰判定(RoomsService.findRejoinableRoom)の両方で使う共通ルール。
export function canEnterRoom(room: Room, userId: string): boolean {
  // ルームの参加者として登録されているか確認
  if (!room.participants[userId]) return false;

  const session = room.gameSession;
  if (!session) return true; // まだセッションが作られていない(waiting)なら参加可能

  if (session.phase === 'ended') return false;

  const player = session.players[userId];
  if (session.phase === 'waiting') return true;

  // countdown/playing: セッション開始時にいなかった人は入れない
  if (!player) return false;

  // 接続中プレイヤーの追加ソケット (StrictMode の二重接続や別タブ) は許可する。
  // ソケットの多重ログイン防止はしない — 誰がどのソケットを持つかは
  // SocketPresenceService の責務であり、ここでは関知しない。
  if (!player.isDisconnected) return true;

  // 切断中は猶予時間内の再接続のみ許可する
  const connection = session.playerConnections[userId];
  if (!connection) return false;

  const isTimedOut =
    Date.now() - connection.lastActiveTime >= DISCONNECT_TIMEOUT_MS;
  if (isTimedOut) return false;

  return true;
}

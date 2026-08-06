import { Injectable, Logger } from '@nestjs/common';
import type { PresenceStatus } from '@ft_transcendence/shared/realtime-events.types';

type PresenceKeyInput = {
  namespace: string;
  roomId: string;
  userId: string;
};

type PresenceInput = PresenceKeyInput & {
  socketId: string;
};

@Injectable()
export class SocketPresenceService {
  private readonly logger = new Logger(SocketPresenceService.name);
  private readonly activeSockets = new Map<string, Set<string>>();
  private readonly pendingDisconnects = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();
  private readonly activeUserSockets = new Map<
    string,
    Map<string, Set<string>>
  >();

  register(input: PresenceInput) {
    const key = this.key(input);
    this.cancelPending(key);

    const sockets = this.activeSockets.get(key) ?? new Set<string>();
    sockets.add(input.socketId);
    this.activeSockets.set(key, sockets);

    const users =
      this.activeUserSockets.get(input.namespace) ??
      new Map<string, Set<string>>();
    const userSockets = users.get(input.userId) ?? new Set<string>();
    userSockets.add(input.socketId);
    users.set(input.userId, userSockets);
    this.activeUserSockets.set(input.namespace, users);

    return sockets.size;
  }

  unregister(input: PresenceInput) {
    const key = this.key(input);
    const sockets = this.activeSockets.get(key);
    if (!sockets) return 0;

    const deleted = sockets.delete(input.socketId);
    if (!deleted) return sockets.size;

    const users = this.activeUserSockets.get(input.namespace);
    const userSockets = users?.get(input.userId);
    userSockets?.delete(input.socketId);
    if (userSockets?.size === 0) users?.delete(input.userId);
    if (users?.size === 0) this.activeUserSockets.delete(input.namespace);

    if (sockets.size === 0) {
      this.activeSockets.delete(key);
      return 0;
    }

    return sockets.size;
  }

  // 指定した namespace:roomId で、そのユーザーの生存中ソケットがあるか
  // (ロビー再訪時の自動復帰ポップアップを、既に別タブで開いている場合は抑制するため)
  hasActiveSocketInRoom(input: PresenceKeyInput): boolean {
    return (this.activeSockets.get(this.key(input))?.size ?? 0) > 0;
  }

  getStatus(userId: string): PresenceStatus {
    if (this.hasActiveSocket('game', userId)) return 'in_game';
    if (this.hasActiveSocket('realtime', userId)) return 'online';
    return 'offline';
  }

  scheduleIfInactive(
    input: PresenceKeyInput,
    delayMs: number,
    onInactive: () => void | Promise<void>,
  ) {
    const key = this.key(input);
    if (this.activeSockets.has(key) || this.pendingDisconnects.has(key)) {
      return;
    }

    const timer = setTimeout(() => {
      this.pendingDisconnects.delete(key);
      if (this.activeSockets.has(key)) return;
      Promise.resolve()
        .then(onInactive)
        .catch((error) => {
          this.logger.error('Error in onInactive callback', error);
        });
    }, delayMs);

    this.pendingDisconnects.set(key, timer);
  }

  private cancelPending(key: string) {
    const timer = this.pendingDisconnects.get(key);
    if (!timer) return;

    clearTimeout(timer);
    this.pendingDisconnects.delete(key);
  }

  private hasActiveSocket(namespace: string, userId: string) {
    return (this.activeUserSockets.get(namespace)?.get(userId)?.size ?? 0) > 0;
  }

  private key(input: PresenceKeyInput) {
    return `${input.namespace}:${input.roomId}:${input.userId}`;
  }
}

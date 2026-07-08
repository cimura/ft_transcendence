import { Injectable } from '@nestjs/common';

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
  private readonly activeSockets = new Map<string, Set<string>>();
  private readonly pendingDisconnects = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();

  register(input: PresenceInput) {
    const key = this.key(input);
    this.cancelPending(key);

    const sockets = this.activeSockets.get(key) ?? new Set<string>();
    sockets.add(input.socketId);
    this.activeSockets.set(key, sockets);

    return sockets.size;
  }

  unregister(input: PresenceInput) {
    const key = this.key(input);
    const sockets = this.activeSockets.get(key);
    if (!sockets) return 0;

    sockets.delete(input.socketId);
    if (sockets.size === 0) {
      this.activeSockets.delete(key);
      return 0;
    }

    return sockets.size;
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
      void onInactive();
    }, delayMs);

    this.pendingDisconnects.set(key, timer);
  }

  private cancelPending(key: string) {
    const timer = this.pendingDisconnects.get(key);
    if (!timer) return;

    clearTimeout(timer);
    this.pendingDisconnects.delete(key);
  }

  private key(input: PresenceKeyInput) {
    return `${input.namespace}:${input.roomId}:${input.userId}`;
  }
}

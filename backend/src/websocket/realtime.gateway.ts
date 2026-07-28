import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import type {
  RealtimeClientToServerEvents,
  RealtimeNotification,
  RealtimeServerToClientEvents,
} from '@ft_transcendence/shared/realtime-events.types';
import { getSocketCorsOrigins } from './socket-cors';
import { SocketAuthService } from './socket-auth.service';
import { SocketPresenceService } from './socket-presence.service';

type RealtimeSocketData = {
  user?: { id: string };
};

type RealtimeSocket = Socket<
  RealtimeClientToServerEvents,
  RealtimeServerToClientEvents,
  Record<string, never>,
  RealtimeSocketData
>;

@WebSocketGateway({
  namespace: '/realtime',
  cors: { origin: getSocketCorsOrigins() },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server: Server<RealtimeClientToServerEvents, RealtimeServerToClientEvents>;

  constructor(
    private readonly socketAuthService: SocketAuthService,
    private readonly socketPresenceService: SocketPresenceService,
  ) {}

  async handleConnection(client: RealtimeSocket) {
    const user = this.socketAuthService.authenticate(client);
    if (!user) {
      client.disconnect();
      this.logger.warn(
        `rejected unauthenticated realtime socket: ${client.id}`,
      );
      return;
    }

    client.data.user = user;
    await client.join(this.userRoom(user.id));

    const previousStatus = this.socketPresenceService.getStatus(user.id);
    this.socketPresenceService.register({
      namespace: 'realtime',
      roomId: 'global',
      userId: user.id,
      socketId: client.id,
    });
    this.emitPresenceUpdatedIfChanged(user.id, previousStatus);
  }

  handleDisconnect(client: RealtimeSocket) {
    const userId = client.data.user?.id;
    if (!userId) return;

    const previousStatus = this.socketPresenceService.getStatus(userId);
    this.socketPresenceService.unregister({
      namespace: 'realtime',
      roomId: 'global',
      userId,
      socketId: client.id,
    });
    this.emitPresenceUpdatedIfChanged(userId, previousStatus);
  }

  emitNotificationForUser(userId: string, notification: RealtimeNotification) {
    this.server
      .to(this.userRoom(userId))
      .emit('notification:new', notification);
  }

  emitPresenceUpdatedIfChanged(
    userId: string,
    previousStatus: ReturnType<SocketPresenceService['getStatus']>,
  ) {
    const status = this.socketPresenceService.getStatus(userId);
    if (status === previousStatus || !this.server) return;

    this.server.emit('presence:updated', { userId, status });
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }
}

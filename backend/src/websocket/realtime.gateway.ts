import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
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
export class RealtimeGateway implements OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server: Server<RealtimeClientToServerEvents, RealtimeServerToClientEvents>;

  constructor(private readonly socketAuthService: SocketAuthService) {}

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
  }

  emitNotificationForUser(userId: string, notification: RealtimeNotification) {
    this.server
      .to(this.userRoom(userId))
      .emit('notification:new', notification);
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }
}

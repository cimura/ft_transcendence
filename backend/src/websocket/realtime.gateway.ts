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
import { FriendRequestStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma.service';
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

export interface RealtimeNotificationPort {
  emitNotificationForUser(
    userId: string,
    notification: RealtimeNotification,
  ): void;
}

@WebSocketGateway({
  namespace: '/realtime',
  cors: { origin: getSocketCorsOrigins() },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect, RealtimeNotificationPort
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server: Server<RealtimeClientToServerEvents, RealtimeServerToClientEvents>;

  constructor(
    private readonly socketAuthService: SocketAuthService,
    private readonly socketPresenceService: SocketPresenceService,
    private readonly prisma: PrismaService,
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
    await this.emitPresenceUpdatedIfChanged(user.id, previousStatus);
  }

  async handleDisconnect(client: RealtimeSocket) {
    const userId = client.data.user?.id;
    if (!userId) return;

    const previousStatus = this.socketPresenceService.getStatus(userId);
    this.socketPresenceService.unregister({
      namespace: 'realtime',
      roomId: 'global',
      userId,
      socketId: client.id,
    });
    await this.emitPresenceUpdatedIfChanged(userId, previousStatus);
  }

  emitNotificationForUser(userId: string, notification: RealtimeNotification) {
    this.server
      .to(this.userRoom(userId))
      .emit('notification:new', notification);
  }

  async emitPresenceUpdatedIfChanged(
    userId: string,
    previousStatus: ReturnType<SocketPresenceService['getStatus']>,
  ): Promise<void> {
    const status = this.socketPresenceService.getStatus(userId);
    if (status === previousStatus || !this.server) return;

    try {
      const friendships = await this.prisma.friendship.findMany({
        where: {
          status: FriendRequestStatus.ACCEPTED,
          OR: [{ requesterId: userId }, { receiverId: userId }],
        },
        select: { requesterId: true, receiverId: true },
      });
      const recipientIds = new Set<string>([userId]);

      for (const friendship of friendships) {
        recipientIds.add(
          friendship.requesterId === userId
            ? friendship.receiverId
            : friendship.requesterId,
        );
      }

      this.server
        .to([...recipientIds].map((recipientId) => this.userRoom(recipientId)))
        .emit('presence:updated', { userId, status });
    } catch (error) {
      this.logger.error(
        `Failed to broadcast presence update { userId: '${userId}' }`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }
}

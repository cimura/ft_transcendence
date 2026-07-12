// 1. define RoomsGateway
// 2. log when a socket connects
// 3. log when a socket disconnects

import {
  ConflictException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  WebSocketServer,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { RoomsService } from './rooms.service';
import { SocketAuthService } from '../websocket/socket-auth.service';
import { SocketPresenceService } from '../websocket/socket-presence.service';
import { getSocketCorsOrigins } from '../websocket/socket-cors';
import type {
  RoomClientToServerEvents,
  RoomServerToClientEvents,
} from '@ft_transcendence/shared/room-events.types';

type RoomSocketData = {
  user?: {
    id: string;
  };
  roomId?: string;
};

type RoomSocket = Socket<
  RoomClientToServerEvents,
  RoomServerToClientEvents,
  Record<string, never>,
  RoomSocketData
>;

@WebSocketGateway({
  namespace: '/rooms',
  cors: { origin: getSocketCorsOrigins() },
})
export class RoomsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RoomsGateway.name);

  @WebSocketServer()
  server: Server<RoomClientToServerEvents, RoomServerToClientEvents>;

  constructor(
    private readonly roomsService: RoomsService,
    private readonly socketAuthService: SocketAuthService,
    private readonly socketPresenceService: SocketPresenceService,
  ) {}

  handleConnection(client: RoomSocket) {
    const user = this.socketAuthService.authenticate(client);
    if (!user) {
      client.disconnect();
      this.logger.log(`rejected unauthenticated socket: ${client.id}`);
      return;
    }

    client.data.user = user;
    this.logger.log(`connected: ${client.id}`);
  }

  handleDisconnect(client: RoomSocket) {
    this.logger.log(`disconnected: ${client.id}`);
    const roomId = client.data.roomId;
    const userId = client.data.user?.id;
    if (!roomId || !userId) return;

    this.socketPresenceService.unregister({
      namespace: 'rooms',
      roomId,
      userId,
      socketId: client.id,
    });
    this.socketPresenceService.scheduleIfInactive(
      { namespace: 'rooms', roomId, userId },
      2000,
      () => this.leaveRoomAfterDisconnect(roomId, userId),
    );
  }

  private async leaveRoomAfterDisconnect(roomId: string, userId: string) {
    try {
      const result = await this.roomsService.leave(roomId, userId);
      if ('id' in result) {
        this.emitRoomUpdated(result);
      } else {
        this.emitRoomDeleted(result.roomId);
      }
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        return;
      }
      this.logger.error('failed to leave room on disconnect', error);
    }
  }

  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @ConnectedSocket() client: RoomSocket,
    @MessageBody() data: { roomId?: string },
  ) {
    if (!data.roomId) return;
    const userId = client.data.user?.id;
    if (!userId) {
      client.emit('room:error', { message: 'Unauthenticated socket' });
      client.disconnect();
      return;
    }

    const previousRoomId = client.data.roomId;

    try {
      await client.join(data.roomId);
    } catch (error) {
      this.logger.error(
        `failed to join room ${data.roomId}`,
        error instanceof Error ? error.stack : String(error),
      );
      client.emit('room:error', {
        message: 'ルームへの参加に失敗しました',
      });
      return;
    }

    if (previousRoomId && previousRoomId !== data.roomId) {
      this.socketPresenceService.unregister({
        namespace: 'rooms',
        roomId: previousRoomId,
        userId,
        socketId: client.id,
      });
      this.socketPresenceService.scheduleIfInactive(
        { namespace: 'rooms', roomId: previousRoomId, userId },
        2000,
        () => this.leaveRoomAfterDisconnect(previousRoomId, userId),
      );
      await client.leave(previousRoomId);
    }

    client.data.roomId = data.roomId;
    this.socketPresenceService.register({
      namespace: 'rooms',
      roomId: data.roomId,
      userId,
      socketId: client.id,
    });
    this.logger.log(`room:join ${client.id} room=${data.roomId}`);
  }

  @SubscribeMessage('room:leave')
  async handleLeaveRoom(@ConnectedSocket() client: RoomSocket) {
    if (!client.data.roomId) return;
    const userId = client.data.user?.id;
    if (userId) {
      this.socketPresenceService.unregister({
        namespace: 'rooms',
        roomId: client.data.roomId,
        userId,
        socketId: client.id,
      });
    }
    await client.leave(client.data.roomId);
    client.data.roomId = undefined;
    this.logger.log(`room:leave ${client.id}`);
  }

  emitRoomUpdated(room: Awaited<ReturnType<RoomsService['join']>>) {
    this.logger.log(`room:updated ${room.id}`);
    this.server.to(room.id).emit('room:updated', room);
  }

  emitRoomDeleted(roomId: string) {
    this.logger.log(`room:deleted ${roomId}`);
    this.server.to(roomId).emit('room:deleted', { roomId });
  }
}

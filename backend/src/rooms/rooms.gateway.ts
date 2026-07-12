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
  WebSocketServer,
  MessageBody,
  Ack,
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

type ChatAck = (response: { ok: boolean; error?: string }) => void;

type ChatPayload = {
  roomId?: unknown;
  text?: unknown;
  content?: unknown;
  message?: unknown;
};

type SocketChatMessage = Awaited<
  ReturnType<RoomsService['createSocketMessage']>
>;

type RoomsServerToClientEvents = RoomServerToClientEvents & {
  'room:created': (room: Awaited<ReturnType<RoomsService['create']>>) => void;
  'chat:history': (payload: {
    roomId: string;
    messages: SocketChatMessage[];
  }) => void;
  'chat:message': (message: SocketChatMessage) => void;
  'chat:error': (payload: { message: string }) => void;
};

type RoomsSocketData = {
  user?: {
    id: string;
  };
  chatRoomId?: string;
  roomId?: string;
};

type RoomsSocket = Socket<
  RoomClientToServerEvents,
  RoomsServerToClientEvents,
  Record<string, never>,
  RoomsSocketData
>;

@WebSocketGateway({
  namespace: '/rooms',
  cors: { origin: getSocketCorsOrigins() },
})
export class RoomsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RoomsGateway.name);
  @WebSocketServer()
  server: Server<RoomClientToServerEvents, RoomsServerToClientEvents>;

  private readonly chatEventQueues = new Map<string, Promise<void>>();

  constructor(
    private readonly roomsService: RoomsService,
    private readonly socketAuthService: SocketAuthService,
    private readonly socketPresenceService: SocketPresenceService,
  ) {}

  handleConnection(client: RoomsSocket) {
    const user = this.socketAuthService.authenticate(client);
    if (!user) {
      client.disconnect();
      this.logger.warn(`rejected unauthenticated socket: ${client.id}`);
      return;
    }

    client.data.user = user;
    this.logger.log(`connected: ${client.id}`);
  }
  handleDisconnect(client: RoomsSocket) {
    this.chatEventQueues.delete(client.id);
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
    @ConnectedSocket() client: RoomsSocket,
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
      client.emit('room:error', { message: 'ルームへの参加に失敗しました' });
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
  async handleLeaveRoom(@ConnectedSocket() client: RoomsSocket) {
    const roomId = client.data.roomId;
    const userId = client.data.user?.id;
    if (!roomId) return;

    if (userId) {
      this.socketPresenceService.unregister({
        namespace: 'rooms',
        roomId,
        userId,
        socketId: client.id,
      });
    }
    await client.leave(roomId);
    client.data.roomId = undefined;
    this.logger.log(`room:leave ${client.id}`);
  }
  @SubscribeMessage('lobby:join')
  async handleJoinLobby(@ConnectedSocket() client: Socket) {
    await client.join('lobby');
    const rooms = await this.roomsService.findAll('waiting');
    client.emit('lobby:rooms', rooms);
    this.logger.log(`lobby:join ${client.id}`);
    this.logger.log(`sent lobby:rooms count=${rooms.length}`);
  }
  @SubscribeMessage('lobby:leave')
  async handleLeaveLobby(@ConnectedSocket() client: Socket) {
    await client.leave('lobby');
    this.logger.log(`lobby:leave ${client.id}`);
  }

  @SubscribeMessage('chat:join')
  async handleJoinChat(
    @MessageBody() payload: ChatPayload,
    @ConnectedSocket() client: RoomsSocket,
  ) {
    return this.runChatEvent(client, async () => {
      try {
        const userId = this.authenticate(client);
        const roomId = this.getRoomId(payload);
        const roomName = this.chatRoomName(roomId);
        const previousRoomId = client.data.chatRoomId;

        const messages = await this.roomsService.findSocketMessages(
          roomId,
          userId,
        );

        if (previousRoomId && previousRoomId !== roomId) {
          await client.leave(this.chatRoomName(previousRoomId));
        }

        await client.join(roomName);
        client.data.chatRoomId = roomId;
        client.emit('chat:history', { roomId, messages });
        this.logger.log(`chat:join ${client.id} room=${roomId}`);
      } catch (error) {
        this.emitChatError(client, error);
      }
    });
  }

  @SubscribeMessage('chat:leave')
  async handleLeaveChat(
    @MessageBody() payload: ChatPayload,
    @ConnectedSocket() client: RoomsSocket,
  ) {
    return this.runChatEvent(client, async () => {
      const roomId =
        typeof payload?.roomId === 'string'
          ? payload.roomId
          : client.data.chatRoomId;

      if (!roomId) return;

      await client.leave(this.chatRoomName(roomId));

      if (client.data.chatRoomId === roomId) {
        client.data.chatRoomId = undefined;
      }

      this.logger.log(`chat:leave ${client.id} room=${roomId}`);
    });
  }

  @SubscribeMessage('chat:message')
  async handleChatMessage(
    @MessageBody() payload: ChatPayload,
    @ConnectedSocket() client: RoomsSocket,
    @Ack() ack?: ChatAck,
  ) {
    return this.runChatEvent(client, async () => {
      try {
        const userId = this.authenticate(client);
        const roomId = this.getRoomId(payload);
        const text = this.getChatText(payload);
        const roomName = this.chatRoomName(roomId);
        const previousRoomId = client.data.chatRoomId;
        const message = await this.roomsService.createSocketMessage(
          roomId,
          userId,
          text,
        );

        if (previousRoomId !== roomId) {
          if (previousRoomId) {
            await client.leave(this.chatRoomName(previousRoomId));
          }

          await client.join(roomName);
          client.data.chatRoomId = roomId;
        }

        this.server.to(roomName).emit('chat:message', message);
        ack?.({ ok: true });
        this.logger.log(`chat:message ${client.id} room=${roomId}`);
      } catch (error) {
        const message = this.getErrorMessage(error);
        this.emitChatError(client, error);
        ack?.({ ok: false, error: message });
      }
    });
  }

  emitRoomCreated(room: Awaited<ReturnType<RoomsService['create']>>) {
    this.logger.log(`room:created ${room.id}`);
    this.server.to('lobby').emit('room:created', room);
  }

  emitRoomUpdated(room: Awaited<ReturnType<RoomsService['join']>>) {
    this.logger.log(`room:updated ${room.id}`);
    this.server.to('lobby').emit('room:updated', room);
    this.server.to(room.id).emit('room:updated', room);
  }

  emitRoomDeleted(roomId: string) {
    this.logger.log(`room:deleted ${roomId}`);
    this.server.to('lobby').emit('room:deleted', { roomId });
    this.server.to(roomId).emit('room:deleted', { roomId });
  }

  private authenticate(client: RoomsSocket) {
    const user =
      client.data.user ?? this.socketAuthService.authenticate(client);
    if (!user) throw new Error('Authentication token is required');
    client.data.user = user;
    return user.id;
  }

  private getRoomId(payload: ChatPayload) {
    if (typeof payload?.roomId !== 'string' || !payload.roomId.trim()) {
      throw new Error('roomId is required');
    }

    return payload.roomId.trim();
  }

  private getChatText(payload: ChatPayload) {
    const text = payload?.text ?? payload?.content ?? payload?.message;

    if (typeof text !== 'string' || !text.trim()) {
      throw new Error('Message content is required');
    }

    return text;
  }

  private chatRoomName(roomId: string) {
    return `room:${roomId}`;
  }

  private runChatEvent(client: RoomsSocket, operation: () => Promise<void>) {
    const previous = this.chatEventQueues.get(client.id) ?? Promise.resolve();
    const current = previous.then(operation, operation);
    const settled = current.catch(() => undefined);

    this.chatEventQueues.set(client.id, settled);
    void settled.then(() => {
      if (this.chatEventQueues.get(client.id) === settled) {
        this.chatEventQueues.delete(client.id);
      }
    });

    return current;
  }

  private emitChatError(client: RoomsSocket, error: unknown) {
    client.emit('chat:error', { message: this.getErrorMessage(error) });
  }

  private getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Chat request failed';
  }
}

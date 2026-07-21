import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UsePipes, ValidationPipe, Logger } from '@nestjs/common';
import { SocketAuthService } from '../websocket/socket-auth.service';
import { RoomsChatService } from './rooms-chat.service';
import { getSocketCorsOrigins } from '../websocket/socket-cors';
import {
  RoomJoinDto,
  ChatJoinDto,
  ChatLeaveDto,
  ChatMessageDto,
} from './dto/events.dto';
import {
  RoomClientToServerEvents,
  RoomServerToClientEvents,
  RoomSnapshot,
} from '@ft_transcendence/shared/rooms-events.types';
import type { RoomResponse } from '../common/types/room.type';

interface ConnectionData {
  user: {
    id: string;
  };
  roomId?: string;
}

type RoomsSocket = Socket<
  RoomClientToServerEvents,
  RoomServerToClientEvents,
  Record<string, never>,
  ConnectionData
>;

@WebSocketGateway({
  namespace: 'rooms',
  cors: {
    origin: getSocketCorsOrigins(),
    credentials: true,
  },
})
@UsePipes(new ValidationPipe({ transform: true }))
export class RoomsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server<RoomClientToServerEvents, RoomServerToClientEvents>;

  private readonly logger = new Logger(RoomsGateway.name);

  constructor(
    private readonly socketAuthService: SocketAuthService,
    private readonly roomsChatService: RoomsChatService,
  ) {}

  handleConnection(client: RoomsSocket) {
    const user = this.socketAuthService.authenticate(client);
    if (!user) {
      client.disconnect();
      return;
    }
    client.data.user = user;
    this.logger.log(`Client connected: ${client.id} (user: ${user.id})`);
  }

  handleDisconnect(client: RoomsSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('room:join')
  handleRoomJoin(
    @ConnectedSocket() client: RoomsSocket,
    @MessageBody() dto: RoomJoinDto,
  ) {
    if (client.data.roomId) {
      void client.leave(client.data.roomId);
    }
    void client.join(dto.roomId);
    client.data.roomId = dto.roomId;
    this.logger.log(`Client ${client.id} joined room ${dto.roomId}`);
  }

  @SubscribeMessage('room:leave')
  handleRoomLeave(@ConnectedSocket() client: RoomsSocket) {
    if (client.data.roomId) {
      void client.leave(client.data.roomId);
      this.logger.log(`Client ${client.id} left room ${client.data.roomId}`);
      client.data.roomId = undefined;
    }
  }

  @SubscribeMessage('chat:join')
  async handleChatJoin(
    @ConnectedSocket() client: RoomsSocket,
    @MessageBody() dto: ChatJoinDto,
  ) {
    const roomId = dto.roomId;
    const chatRoom = `chat:${roomId}`;

    try {
      const messages = await this.roomsChatService.findMessages(
        roomId,
        client.data.user.id,
      );
      void client.join(chatRoom);
      client.emit('chat:history', {
        roomId,
        messages: messages.map((m) => ({
          id: m.id,
          roomId: m.roomId,
          userId: m.senderId,
          username: m.senderName,
          text: m.content,
          createdAt: m.createdAt.toISOString(),
        })),
      });
    } catch {
      client.emit('chat:error', { message: '履歴の取得に失敗しました' });
    }
  }

  @SubscribeMessage('chat:leave')
  handleChatLeave(
    @ConnectedSocket() client: RoomsSocket,
    @MessageBody() dto: ChatLeaveDto,
  ) {
    void client.leave(`chat:${dto.roomId}`);
  }

  @SubscribeMessage('chat:message')
  async handleChatMessage(
    @ConnectedSocket() client: RoomsSocket,
    @MessageBody() dto: ChatMessageDto,
  ) {
    try {
      const message = await this.roomsChatService.createMessage(
        dto.roomId,
        client.data.user.id,
        { content: dto.text },
      );

      const payload = {
        id: message.id,
        roomId: message.roomId,
        userId: message.senderId,
        username: message.senderName,
        text: message.content,
        createdAt: message.createdAt.toISOString(),
      };

      this.server.to(`chat:${dto.roomId}`).emit('chat:message', payload);

      return { ok: true };
    } catch (error: unknown) {
      const errMsg =
        error instanceof Error ? error.message : 'メッセージを送信できません';
      return { ok: false, error: errMsg };
    }
  }

  emitRoomUpdated(room: RoomResponse) {
    const snapshot: RoomSnapshot = {
      id: room.id,
      gameId: room.gameId,
      name: room.name,
      hostId: room.hostId,
      hostName: room.hostName,
      players: room.players.map((p) => ({
        userId: p.userId,
        username: p.username,
        avatarUrl: p.avatarUrl,
        isReady: p.isReady,
        isHost: p.isHost,
        joinedAt: p.joinedAt.toISOString(),
      })),
      maxPlayers: room.maxPlayers,
      status: room.status,
      mode: room.mode,
      settingsSnapshot: room.settingsSnapshot,
      createdAt: room.createdAt.toISOString(),
      updatedAt: room.updatedAt.toISOString(),
      startedAt: room.startedAt?.toISOString(),
      finishedAt: room.finishedAt?.toISOString(),
    };

    this.server.to(room.id).emit('room:updated', snapshot);
  }

  emitRoomDeleted(roomId: string) {
    this.server.to(roomId).emit('room:deleted', { roomId });
  }
}

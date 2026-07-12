// 1. define RoomsGateway
// 2. log when a socket connects
// 3. log when a socket disconnects

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
import { JwtService } from '@nestjs/jwt';
import { Socket, Server } from 'socket.io';
import { RoomsService } from './rooms.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

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

type RoomsServerToClientEvents = {
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
};

type RoomsSocket = Socket<
  Record<string, never>,
  RoomsServerToClientEvents,
  Record<string, never>,
  RoomsSocketData
>;

@WebSocketGateway()
export class RoomsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly roomsService: RoomsService,
    private readonly jwtService: JwtService,
  ) {}

  handleConnection(client: Socket) {
    console.log(`[RoomsGateway] connected: ${client.id}`);
  }
  handleDisconnect(client: Socket) {
    console.log(`[RoomsGateway] disconnected: ${client.id}`);
  }
  @SubscribeMessage('lobby:join')
  async handleJoinLobby(@ConnectedSocket() client: Socket) {
    await client.join('lobby');
    const rooms = await this.roomsService.findAll('waiting');
    client.emit('lobby:rooms', rooms);
    console.log(`[RoomsGateway] lobby:join ${client.id}`);
    console.log(`[RoomsGateway] sent lobby:rooms count=${rooms.length}`);
  }
  @SubscribeMessage('lobby:leave')
  async handleLeaveLobby(@ConnectedSocket() client: Socket) {
    await client.leave('lobby');
    console.log(`[RoomsGateway] lobby:leave ${client.id}`);
  }

  @SubscribeMessage('chat:join')
  async handleJoinChat(
    @MessageBody() payload: ChatPayload,
    @ConnectedSocket() client: RoomsSocket,
  ) {
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
      console.log(`[RoomsGateway] chat:join ${client.id} room=${roomId}`);
    } catch (error) {
      this.emitChatError(client, error);
    }
  }

  @SubscribeMessage('chat:leave')
  async handleLeaveChat(
    @MessageBody() payload: ChatPayload,
    @ConnectedSocket() client: RoomsSocket,
  ) {
    const roomId =
      typeof payload?.roomId === 'string'
        ? payload.roomId
        : client.data.chatRoomId;

    if (!roomId) return;

    await client.leave(this.chatRoomName(roomId));

    if (client.data.chatRoomId === roomId) {
      client.data.chatRoomId = undefined;
    }

    console.log(`[RoomsGateway] chat:leave ${client.id} room=${roomId}`);
  }

  @SubscribeMessage('chat:message')
  async handleChatMessage(
    @MessageBody() payload: ChatPayload,
    @ConnectedSocket() client: RoomsSocket,
    @Ack() ack?: ChatAck,
  ) {
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
      console.log(`[RoomsGateway] chat:message ${client.id} room=${roomId}`);
    } catch (error) {
      const message = this.getErrorMessage(error);
      this.emitChatError(client, error);
      ack?.({ ok: false, error: message });
    }
  }

  emitRoomCreated(room: Awaited<ReturnType<RoomsService['create']>>) {
    console.log(`[RoomsGateway] room:created ${room.id}`);
    this.server.to('lobby').emit('room:created', room);
  }

  emitRoomUpdated(room: Awaited<ReturnType<RoomsService['join']>>) {
    console.log(`[RoomsGateway] room:updated ${room.id}`);
    this.server.to('lobby').emit('room:updated', room);
  }

  emitRoomDeleted(roomId: string) {
    console.log(`[RoomsGateway] room:deleted ${roomId}`);
    this.server.to('lobby').emit('room:deleted', { roomId });
  }

  private authenticate(client: RoomsSocket) {
    if (client.data.user) {
      return client.data.user.id;
    }

    const tokenValue = (client.handshake.auth as { token?: unknown }).token;
    if (typeof tokenValue !== 'string') {
      throw new Error('Authentication token is required');
    }

    const token = tokenValue.startsWith('Bearer ')
      ? tokenValue.slice('Bearer '.length)
      : tokenValue;
    const payload = this.jwtService.verify<JwtPayload>(token);
    client.data.user = { id: payload.sub };

    return payload.sub;
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

  private emitChatError(client: RoomsSocket, error: unknown) {
    client.emit('chat:error', { message: this.getErrorMessage(error) });
  }

  private getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Chat request failed';
  }
}

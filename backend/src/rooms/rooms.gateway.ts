// 1. define RoomsGateway
// 2. log when a socket connects
// 3. log when a socket disconnects

import {
  ConflictException,
  ForbiddenException,
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
import { JwtService } from '@nestjs/jwt';
import { RoomsService } from './rooms.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

type RoomSocketData = {
  user?: {
    id: string;
  };
  roomId?: string;
};

type RoomSocket = Socket & { data: RoomSocketData };

@WebSocketGateway()
export class RoomsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly pendingDisconnects = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly roomsService: RoomsService,
    private readonly jwtService: JwtService,
  ) {}

  handleConnection(client: RoomSocket) {
    const authHeader = client.handshake.auth.token as string | undefined;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const payload = this.jwtService.verify<JwtPayload>(token);
        client.data.user = { id: payload.sub };
      } catch {
        console.log(`[RoomsGateway] invalid token: ${client.id}`);
      }
    }
    console.log(`[RoomsGateway] connected: ${client.id}`);
  }

  async handleDisconnect(client: RoomSocket) {
    console.log(`[RoomsGateway] disconnected: ${client.id}`);
    const roomId = client.data.roomId;
    const userId = client.data.user?.id;
    if (!roomId || !userId) return;

    const key = this.disconnectKey(roomId, userId);
    if (this.pendingDisconnects.has(key)) return;

    const timer = setTimeout(() => {
      this.pendingDisconnects.delete(key);
      void this.leaveRoomAfterDisconnect(roomId, userId);
    }, 2000);
    this.pendingDisconnects.set(key, timer);
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
      console.error('[RoomsGateway] failed to leave room on disconnect', error);
    }
  }

  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @ConnectedSocket() client: RoomSocket,
    @MessageBody() data: { roomId?: string },
  ) {
    if (!data.roomId) return;
    if (client.data.roomId && client.data.roomId !== data.roomId) {
      await client.leave(client.data.roomId);
    }
    client.data.roomId = data.roomId;
    const userId = client.data.user?.id;
    if (userId) {
      const key = this.disconnectKey(data.roomId, userId);
      const timer = this.pendingDisconnects.get(key);
      if (timer) {
        clearTimeout(timer);
        this.pendingDisconnects.delete(key);
      }
    }
    await client.join(data.roomId);
    console.log(`[RoomsGateway] room:join ${client.id} room=${data.roomId}`);
  }

  @SubscribeMessage('room:leave')
  async handleLeaveRoom(@ConnectedSocket() client: RoomSocket) {
    if (!client.data.roomId) return;
    await client.leave(client.data.roomId);
    client.data.roomId = undefined;
    console.log(`[RoomsGateway] room:leave ${client.id}`);
  }

  emitRoomUpdated(room: Awaited<ReturnType<RoomsService['join']>>) {
    console.log(`[RoomsGateway] room:updated ${room.id}`);
    this.server.to(room.id).emit('room:updated', room);
  }

  emitRoomDeleted(roomId: string) {
    console.log(`[RoomsGateway] room:deleted ${roomId}`);
    this.server.to(roomId).emit('room:deleted', { roomId });
  }

  private disconnectKey(roomId: string, userId: string) {
    return `${roomId}:${userId}`;
  }
}

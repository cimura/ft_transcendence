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
import { SocketPresenceService } from '../websocket/socket-presence.service';
import { RoomsChatService } from './rooms-chat.service';
import { RoomsLobbyService } from './rooms-lobby.service';
import { RoomsService } from './rooms.service';
import { RoomsStateService } from './rooms-state.service';
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
} from '@ft_transcendence/shared/rooms-events.types';
import type { RoomResponse } from '../common/types/room.type';

// room:leave / disconnect からこの猶予内に再接続(room:join)しなければ自動退出させる。
// game 側の DISCONNECT_TIMEOUT_MS (30秒) と揃えている。
const ROOMS_DISCONNECT_GRACE_MS = 30_000;
const LOBBY_ROOM = 'lobby';

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
    private readonly socketPresenceService: SocketPresenceService,
    private readonly roomsChatService: RoomsChatService,
    private readonly roomsLobbyService: RoomsLobbyService,
    private readonly roomsService: RoomsService,
    private readonly roomsState: RoomsStateService,
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
    if (client.data.roomId && client.data.user) {
      this.unregisterRoomPresence(
        client.data.roomId,
        client.data.user.id,
        client.id,
      );
    }
  }

  @SubscribeMessage('room:join')
  async handleRoomJoin(
    @ConnectedSocket() client: RoomsSocket,
    @MessageBody() dto: RoomJoinDto,
  ) {
    if (client.data.roomId && client.data.roomId !== dto.roomId) {
      this.leaveCurrentRoom(client);
    }
    await client.join(dto.roomId);
    client.data.roomId = dto.roomId;

    if (client.data.user) {
      this.socketPresenceService.register({
        namespace: 'rooms',
        roomId: dto.roomId,
        userId: client.data.user.id,
        socketId: client.id,
      });
    }

    // REST mutations can happen before this socket has finished joining the
    // Socket.IO room. Always send an authoritative snapshot on subscription so
    // a missed join/ready broadcast cannot leave the squad count stale.
    try {
      const room = this.roomsService.findOne(dto.roomId);
      client.emit('room:updated', this.roomsLobbyService.toSnapshot(room));
    } catch {
      client.emit('room:error', { message: 'Room not found' });
    }

    this.logger.log(`Client ${client.id} joined room ${dto.roomId}`);
  }

  @SubscribeMessage('room:leave')
  handleRoomLeave(@ConnectedSocket() client: RoomsSocket) {
    this.leaveCurrentRoom(client);
  }

  @SubscribeMessage('lobby:join')
  handleLobbyJoin(@ConnectedSocket() client: RoomsSocket) {
    void client.join(LOBBY_ROOM);
    const rooms = this.roomsLobbyService.getLobbyRooms();
    client.emit(
      'lobby:rooms',
      rooms.map((room) => this.roomsLobbyService.toSnapshot(room)),
    );
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

  emitRoomCreated(room: RoomResponse) {
    if (!this.roomsLobbyService.isLobbyVisible(room)) return;
    this.server
      .to(LOBBY_ROOM)
      .emit('room:created', this.roomsLobbyService.toSnapshot(room));
  }

  emitRoomUpdated(room: RoomResponse) {
    const snapshot = this.roomsLobbyService.toSnapshot(room);

    this.server.to(room.id).emit('room:updated', snapshot);
    // WAITING→PLAYING などステータス変化時もロビー側で最新表示にする
    // (waiting でなくなった場合、フロント側でロビー一覧から取り除かれる)
    if (room.mode === 'online') {
      this.server.to(LOBBY_ROOM).emit('room:updated', snapshot);
    }
  }

  emitRoomDeleted(roomId: string) {
    this.server.to(roomId).emit('room:deleted', { roomId });
    this.server.to(LOBBY_ROOM).emit('room:deleted', { roomId });
  }

  private leaveCurrentRoom(client: RoomsSocket) {
    const roomId = client.data.roomId;
    if (!roomId) return;

    void client.leave(roomId);
    client.data.roomId = undefined;

    if (client.data.user) {
      this.unregisterRoomPresence(roomId, client.data.user.id, client.id);
    }

    this.logger.log(`Client ${client.id} left room ${roomId}`);
  }

  private unregisterRoomPresence(
    roomId: string,
    userId: string,
    socketId: string,
  ) {
    const remaining = this.socketPresenceService.unregister({
      namespace: 'rooms',
      roomId,
      userId,
      socketId,
    });

    if (remaining === 0) {
      this.socketPresenceService.scheduleIfInactive(
        { namespace: 'rooms', roomId, userId },
        ROOMS_DISCONNECT_GRACE_MS,
        () => this.autoLeaveRoom(roomId, userId),
      );
    }
  }

  // 猶予時間内に再接続 (room:join) がなかった参加者を自動退出させ、
  // ホストが戻らないまま部屋だけが残り続ける「ゴーストルーム」を防ぐ
  private autoLeaveRoom(roomId: string, userId: string) {
    const room = this.roomsState.getRoom(roomId);
    if (!room || room.status !== 'WAITING' || !room.participants[userId]) {
      return;
    }

    try {
      const result = this.roomsService.leave(roomId, userId);
      if ('id' in result) {
        this.emitRoomUpdated(result);
      } else {
        this.emitRoomDeleted(result.roomId);
      }
      this.logger.log(
        `Auto-left inactive participant { roomId: '${roomId}', userId: '${userId}' }`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to auto-leave inactive participant { roomId: '${roomId}', userId: '${userId}', error: '${
          error instanceof Error ? error.message : String(error)
        }' }`,
      );
    }
  }
}

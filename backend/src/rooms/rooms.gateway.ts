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
import {
  UsePipes,
  ValidationPipe,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
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
  RoomSnapshot,
} from '@ft_transcendence/shared/rooms-events.types';
import {
  ROOM_CREATED_EVENT,
  ROOM_UPDATED_EVENT,
  ROOM_DELETED_EVENT,
  RoomCreatedEvent,
  RoomUpdatedEvent,
  RoomDeletedEvent,
} from './events/room-domain-events';

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
      // 切断は一時的な可能性がある(リロード等)ため猶予を挟んで自動退出させる
      this.unregisterRoomPresence(
        client.data.roomId,
        client.data.user.id,
        client.id,
        /* explicit */ false,
      );
    }
  }

  @SubscribeMessage('room:join')
  async handleRoomJoin(
    @ConnectedSocket() client: RoomsSocket,
    @MessageBody() dto: RoomJoinDto,
  ) {
    const userId = client.data.user?.id;
    const room = this.roomsState.getRoom(dto.roomId);
    const isParticipant = userId ? Boolean(room?.participants[userId]) : false;
    const canJoin =
      room?.status === 'waiting' &&
      room.mode === 'online' &&
      Object.keys(room.participants).length < room.maxPlayers;

    if (!userId || (!isParticipant && !canJoin)) {
      client.emit('room:error', { message: 'Cannot join room' });
      return;
    }

    let snapshot: RoomSnapshot;
    try {
      snapshot = this.roomsService.findOne(dto.roomId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        client.emit('room:error', { message: 'Room not found' });
      } else {
        this.logger.error(
          `Failed to prepare room subscription { roomId: '${dto.roomId}', userId: '${userId}' }`,
          error instanceof Error ? error.stack : String(error),
        );
        client.emit('room:error', { message: 'Failed to join room' });
      }
      return;
    }

    let joined = false;
    let presenceRegistrationAttempted = false;
    try {
      await client.join(dto.roomId);
      joined = true;

      if (client.data.roomId && client.data.roomId !== dto.roomId) {
        // 別ルームへの乗り換え: 切断相当なので猶予付きで後始末する
        this.leaveCurrentRoom(client, /* explicit */ false);
      }
      client.data.roomId = dto.roomId;

      presenceRegistrationAttempted = true;
      this.socketPresenceService.register({
        namespace: 'rooms',
        roomId: dto.roomId,
        userId,
        socketId: client.id,
      });

      // REST mutations can happen before this socket has finished joining the
      // Socket.IO room. Always send an authoritative snapshot on subscription so
      // a missed join/ready broadcast cannot leave the squad count stale.
      client.emit('room:updated', snapshot);
    } catch (error) {
      if (client.data.roomId === dto.roomId) {
        client.data.roomId = undefined;
      }
      if (presenceRegistrationAttempted) {
        try {
          // 購読が失敗して socket が部屋に居ない状態なので、切断と同じく猶予付きで扱う
          this.unregisterRoomPresence(
            dto.roomId,
            userId,
            client.id,
            /* explicit */ false,
          );
        } catch (rollbackError) {
          this.logger.warn(
            `Failed to roll back room presence { roomId: '${dto.roomId}', userId: '${userId}', error: '${
              rollbackError instanceof Error
                ? rollbackError.message
                : String(rollbackError)
            }' }`,
          );
        }
      }
      if (joined) {
        try {
          await client.leave(dto.roomId);
        } catch (rollbackError) {
          this.logger.warn(
            `Failed to leave room during rollback { roomId: '${dto.roomId}', userId: '${userId}', error: '${
              rollbackError instanceof Error
                ? rollbackError.message
                : String(rollbackError)
            }' }`,
          );
        }
      }
      this.logger.error(
        `Failed to join room subscription { roomId: '${dto.roomId}', userId: '${userId}' }`,
        error instanceof Error ? error.stack : String(error),
      );
      client.emit('room:error', { message: 'Failed to join room' });
      return;
    }

    this.logger.log(`Client ${client.id} joined room ${dto.roomId}`);
  }

  @SubscribeMessage('room:leave')
  handleRoomLeave(@ConnectedSocket() client: RoomsSocket) {
    // 明示的な退出操作: ドメインからの退出は REST の /rooms/:id/leave が担うため、
    // ここでは presence 解除と socket ルーム離脱のみを即座に行う
    this.leaveCurrentRoom(client, /* explicit */ true);
  }

  @SubscribeMessage('lobby:join')
  handleLobbyJoin(@ConnectedSocket() client: RoomsSocket) {
    void client.join(LOBBY_ROOM);
    const rooms = this.roomsLobbyService.getLobbyRooms();
    client.emit('lobby:rooms', rooms);
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

  // ルームのドメイン状態が変化するたびに RoomsService が発行するイベントを購読し、
  // 該当クライアントへブロードキャストする。状態変更と通知の対応付けをここに一本化することで、
  // 呼び出し元(REST コントローラや切断時の自動退出)ごとに emit し忘れる/二重に emit する事故を防ぐ。
  @OnEvent(ROOM_CREATED_EVENT)
  private handleRoomCreatedEvent({ room }: RoomCreatedEvent) {
    if (!this.roomsLobbyService.isLobbyVisible(room)) return;
    this.server.to(LOBBY_ROOM).emit('room:created', room);
  }

  @OnEvent(ROOM_UPDATED_EVENT)
  private handleRoomUpdatedEvent({ room }: RoomUpdatedEvent) {
    this.server.to(room.id).emit('room:updated', room);
    // waiting→playing などステータス変化時もロビー側で最新表示にする
    // (waiting でなくなった場合、フロント側でロビー一覧から取り除かれる)
    if (room.mode === 'online') {
      this.server.to(LOBBY_ROOM).emit('room:updated', room);
    }
  }

  @OnEvent(ROOM_DELETED_EVENT)
  private handleRoomDeletedEvent({ roomId }: RoomDeletedEvent) {
    this.server.to(roomId).emit('room:deleted', { roomId });
    this.server.to(LOBBY_ROOM).emit('room:deleted', { roomId });
  }

  // explicit=true: 明示的な退出(room:leave)。ドメインからの退出は REST の /rooms/:id/leave
  // が既に担っているため、ここでは presence 解除のみを即座に行い、猶予は挟まない。
  // explicit=false: 切断/ルーム乗り換え。REST 呼び出しを伴わないため、再接続の可能性を
  // 考慮して猶予付きでドメインからも自動退出させる。
  private leaveCurrentRoom(client: RoomsSocket, explicit: boolean) {
    const roomId = client.data.roomId;
    if (!roomId) return;

    void client.leave(roomId);
    client.data.roomId = undefined;

    if (client.data.user) {
      this.unregisterRoomPresence(
        roomId,
        client.data.user.id,
        client.id,
        explicit,
      );
    }

    this.logger.log(`Client ${client.id} left room ${roomId}`);
  }

  private unregisterRoomPresence(
    roomId: string,
    userId: string,
    socketId: string,
    explicit: boolean,
  ) {
    const remaining = this.socketPresenceService.unregister({
      namespace: 'rooms',
      roomId,
      userId,
      socketId,
    });

    // 同一ユーザーの別タブがまだ接続中なら、まだルームに残っているとみなす
    if (remaining !== 0) return;

    // 明示的な退出は REST /leave がドメイン退出を担うため、ここでは何もしない。
    // 非同意切断(explicit=false)のみ、REST が飛ばないので猶予後にドメインからも自動退出させる。
    if (!explicit) {
      this.socketPresenceService.scheduleIfInactive(
        { namespace: 'rooms', roomId, userId },
        ROOMS_DISCONNECT_GRACE_MS,
        () => this.evictParticipant(roomId, userId),
      );
    }
  }

  // 猶予時間内に再接続(room:join)がなかった参加者をドメイン状態から退出させ、結果を配信する。
  // handleDisconnect の猶予経路からのみ呼ばれる、非同意切断(タブ閉じ等)専用の後始末で、
  // ホストが戻らないまま部屋だけが残り続ける「ゴーストルーム」を防ぐ役割を持つ。
  private evictParticipant(roomId: string, userId: string) {
    const room = this.roomsState.getRoom(roomId);
    if (!room || room.status !== 'waiting' || !room.participants[userId]) {
      return;
    }

    try {
      // ドメイン退出とクライアントへのブロードキャストは RoomsService が発行する
      // イベント(handleRoomUpdatedEvent/handleRoomDeletedEvent)経由で行われる
      this.roomsService.leave(roomId, userId);
      this.logger.log(
        `Participant left room { roomId: '${roomId}', userId: '${userId}' }`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to remove participant { roomId: '${roomId}', userId: '${userId}', error: '${
          error instanceof Error ? error.message : String(error)
        }' }`,
      );
    }
  }
}

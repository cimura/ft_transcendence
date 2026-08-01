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
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SocketAuthService } from '../websocket/socket-auth.service';
import { SocketPresenceService } from '../websocket/socket-presence.service';
import { RoomsChatService } from './rooms-chat.service';
import { RoomsLobbyService } from './rooms-lobby.service';
import { RoomsService } from './rooms.service';
import { getSocketCorsOrigins } from '../websocket/socket-cors';
import {
  RoomJoinDto,
  ChatJoinDto,
  ChatLeaveDto,
  ChatMessageDto,
} from './dto/events.dto';
import type { RoomMessage } from '../common/types/room.type';
import {
  ChatMessagePayload,
  RoomClientToServerEvents,
  RoomServerToClientEvents,
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
    const userId = this.requireUserId(client);
    if (!userId) {
      client.emit('room:error', { message: 'Cannot join room' });
      return;
    }

    try {
      // Socket.IO room へ参加する前に、サーバ側で購読権限を検証する。
      // (REST /join と socket room:join は並行に呼ばれ得るため、canSubscribe は
      // 「既に参加済み」または「これから参加できる」のどちらも許可する)
      if (!this.roomsService.canSubscribe(dto.roomId, userId)) {
        throw new ForbiddenException('Cannot join room');
      }
      await this.subscribeToRoom(client, dto.roomId, userId);
    } catch (error) {
      this.emitJoinError(client, error, dto.roomId, userId);
      return;
    }

    this.logger.log(`Client ${client.id} joined room ${dto.roomId}`);
  }

  @SubscribeMessage('room:leave')
  handleRoomLeave(@ConnectedSocket() client: RoomsSocket) {
    // 明示的な退出操作: ドメインからの退出は REST の /rooms/:id/leave が担うため、
    // ここでは presence 解除と socket ルーム離脱のみを即座に行う
    const roomId = client.data.roomId;
    const userId = this.requireUserId(client);
    if (!roomId || !userId) return;

    this.leaveCurrentRoomId(client, roomId, userId, /* explicit */ true);
  }

  @SubscribeMessage('lobby:join')
  async handleLobbyJoin(@ConnectedSocket() client: RoomsSocket) {
    await client.join(LOBBY_ROOM);
    const rooms = this.roomsLobbyService.getLobbyRooms();
    client.emit('lobby:rooms', rooms);
  }

  @SubscribeMessage('chat:join')
  async handleChatJoin(
    @ConnectedSocket() client: RoomsSocket,
    @MessageBody() dto: ChatJoinDto,
  ) {
    const roomId = dto.roomId;
    const userId = this.requireUserId(client);
    if (!userId) return;

    try {
      const messages = await this.roomsChatService.findMessages(roomId, userId);
      await client.join(`chat:${roomId}`);
      client.emit('chat:history', {
        roomId,
        messages: messages.map((m) => this.toChatMessagePayload(m)),
      });
    } catch (error) {
      // Forbidden/NotFound は想定内の拒否。それ以外のみログに残し、区別する。
      if (
        !(error instanceof ForbiddenException) &&
        !(error instanceof NotFoundException)
      ) {
        this.logger.error(
          `Failed to join chat { roomId: '${roomId}', userId: '${userId}' }`,
          error instanceof Error ? error.stack : String(error),
        );
      }
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
    const userId = this.requireUserId(client);
    if (!userId) {
      return { ok: false, error: 'メッセージを送信できません' };
    }

    try {
      const message = await this.roomsChatService.createMessage(
        dto.roomId,
        userId,
        { content: dto.text },
      );

      this.server
        .to(`chat:${dto.roomId}`)
        .emit('chat:message', this.toChatMessagePayload(message));

      return { ok: true };
    } catch (error: unknown) {
      // ドメイン例外のメッセージのみクライアントへ通す。それ以外は内部エラー文言が
      // 漏洩しないよう汎用文言に差し替え、ログに残す。
      if (
        error instanceof ForbiddenException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        return { ok: false, error: error.message };
      }
      this.logger.error(
        `Failed to send chat message { roomId: '${dto.roomId}', userId: '${userId}' }`,
        error instanceof Error ? error.stack : String(error),
      );
      return { ok: false, error: 'メッセージを送信できません' };
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
    this.server.to(LOBBY_ROOM).emit('room:updated', room);
  }

  @OnEvent(ROOM_DELETED_EVENT)
  private handleRoomDeletedEvent({ roomId }: RoomDeletedEvent) {
    this.server.to(roomId).emit('room:deleted', { roomId });
    this.server.to(LOBBY_ROOM).emit('room:deleted', { roomId });
  }

  // --- room:join helpers ---

  // 想定外の例外を「Room not found」等の期待される拒否として扱わないよう、ここで一元的に分類する。
  private emitJoinError(
    client: RoomsSocket,
    error: unknown,
    roomId: string,
    userId: string,
  ) {
    if (error instanceof NotFoundException) {
      client.emit('room:error', { message: 'Room not found' });
      return;
    }
    if (error instanceof ForbiddenException) {
      client.emit('room:error', { message: 'Cannot join room' });
      return;
    }
    this.logger.error(
      `Failed to join room subscription { roomId: '${roomId}', userId: '${userId}' }`,
      error instanceof Error ? error.stack : String(error),
    );
    client.emit('room:error', { message: 'Failed to join room' });
  }

  // Socket.IO room への参加・presence 登録・ルーム切替を行う。途中で失敗した場合は
  // それまでに成功した操作だけを逆順にロールバックし、部分的な状態を残さない。
  private async subscribeToRoom(
    client: RoomsSocket,
    roomId: string,
    userId: string,
  ) {
    const previousRoomId = client.data.roomId;
    const rollbacks: Array<() => void | Promise<void>> = [];

    try {
      await client.join(roomId);
      rollbacks.push(() => client.leave(roomId));

      this.socketPresenceService.register({
        namespace: 'rooms',
        roomId,
        userId,
        socketId: client.id,
      });
      // 購読処理中の一時的な失敗であり実際の切断ではないため、presence の登録だけを取り消し、
      // 猶予付き自動退出(evictIfWaiting)は予約しない
      rollbacks.push(() => {
        this.socketPresenceService.unregister({
          namespace: 'rooms',
          roomId,
          userId,
          socketId: client.id,
        });
      });

      client.data.roomId = roomId;
      rollbacks.push(() => {
        client.data.roomId = previousRoomId;
      });

      // REST 側の変更が socket 参加前に起きている可能性があるため、Socket.IO room への
      // 参加が完了した「後」に最新スナップショットを読み直して送る
      client.emit('room:updated', this.roomsService.findOne(roomId));
    } catch (error) {
      await this.runRollbacks(rollbacks);
      throw error; // 分類とクライアント通知は emitJoinError に委ねる
    }

    // 全て成功した後にのみ旧ルームを後始末する。失敗時は旧ルームの購読が保たれる。
    if (previousRoomId && previousRoomId !== roomId) {
      this.leaveCurrentRoomId(
        client,
        previousRoomId,
        userId,
        /* explicit */ false,
      );
    }
  }

  private async runRollbacks(rollbacks: Array<() => void | Promise<void>>) {
    for (const undo of rollbacks.reverse()) {
      try {
        await undo();
      } catch (error) {
        this.logger.warn(
          `Failed to roll back room subscription: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  // --- shared helpers ---

  private requireUserId(client: RoomsSocket): string | undefined {
    return client.data.user?.id;
  }

  private toChatMessagePayload(message: RoomMessage): ChatMessagePayload {
    return {
      id: message.id,
      roomId: message.roomId,
      userId: message.senderId,
      username: message.senderName,
      text: message.content,
      createdAt: message.createdAt.toISOString(),
    };
  }

  // explicit=true: 明示的な退出(room:leave)。ドメインからの退出は REST の /rooms/:id/leave
  // が既に担っているため、ここでは presence 解除のみを即座に行い、猶予は挟まない。
  // explicit=false: 切断/ルーム乗り換え。REST 呼び出しを伴わないため、再接続の可能性を
  // 考慮して猶予付きでドメインからも自動退出させる。
  private leaveCurrentRoomId(
    client: RoomsSocket,
    roomId: string,
    userId: string,
    explicit: boolean,
  ) {
    void client.leave(roomId);
    // 呼び出し時点で既に別ルームへ切り替わっている場合(乗り換え成功後の旧ルーム後始末)は
    // 現在の roomId を巻き戻してしまわないようにする
    if (client.data.roomId === roomId) {
      client.data.roomId = undefined;
    }

    this.unregisterRoomPresence(roomId, userId, client.id, explicit);

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
    try {
      // 既に退出済み/ゲーム開始済みかどうかの判定とドメイン退出は RoomsService が担う。
      // クライアントへのブロードキャストは RoomsService が発行するイベント
      // (handleRoomUpdatedEvent/handleRoomDeletedEvent)経由で行われる
      this.roomsService.evictIfWaiting(roomId, userId);
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

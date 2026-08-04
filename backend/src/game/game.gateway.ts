import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Logger, UseFilters } from '@nestjs/common';
import { Server } from 'socket.io';
import { GameService } from './game.service';
import { GameExceptionFilter } from './game-exception.filter';
import { SocketAuthService } from '../websocket/socket-auth.service';
import { SocketPresenceService } from '../websocket/socket-presence.service';
import { RealtimeGateway } from '../websocket/realtime.gateway';
import { getSocketCorsOrigins } from '../websocket/socket-cors';
import type { GameSocket } from '../common/types/game.type';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@ft_transcendence/shared/game-events.types';
import type { PresenceStatus } from '@ft_transcendence/shared/realtime-events.types';

@WebSocketGateway({
  namespace: '/game',
  cors: { origin: getSocketCorsOrigins() },
})
@UseFilters(GameExceptionFilter)
export class GameGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(GameGateway.name);
  @WebSocketServer()
  server: Server<ClientToServerEvents, ServerToClientEvents>;

  constructor(
    private readonly gameService: GameService,
    private readonly socketAuthService: SocketAuthService,
    private readonly socketPresenceService: SocketPresenceService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  afterInit(server: Server<ClientToServerEvents, ServerToClientEvents>) {
    this.gameService.setServer(server);
  }

  handleConnection(client: GameSocket) {
    const user = this.socketAuthService.authenticate(client);
    if (!user) {
      client.disconnect();
      this.logger.warn(`User could not connect to Game WebSocket`);
      return;
    }

    client.data.user = user;
    this.logger.log(`User connected to Game WebSocket { useId: '${user.id}' }`);
  }

  @SubscribeMessage('game:join')
  async handleJoin(
    @MessageBody() data: Parameters<ClientToServerEvents['game:join']>[0],
    @ConnectedSocket()
    client: GameSocket,
  ) {
    const user = client.data.user;
    if (!user) return;

    const previousRoomId = client.data.roomId;
    const previousPresenceStatus = this.socketPresenceService.getStatus(
      user.id,
    );

    try {
      await client.join(data.roomId);
    } catch (error) {
      this.logger.warn(
        `Failed to join Socket.IO room { roomId: '${data.roomId}', socketId: '${client.id}' }: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new WsException('ルームに参加できません。');
    }

    let initData: Parameters<ServerToClientEvents['game:init']>[0];
    try {
      initData = this.gameService.handleGameJoin(data.roomId, user.id);
    } catch (error) {
      if (previousRoomId !== data.roomId) {
        try {
          await client.leave(data.roomId);
        } catch (rollbackError) {
          this.logger.error(
            `Failed to rollback socket room join { roomId: '${data.roomId}', userId: '${user.id}' }`,
            rollbackError instanceof Error
              ? rollbackError.stack
              : String(rollbackError),
          );
        }
      }
      throw error;
    }

    if (previousRoomId && previousRoomId !== data.roomId) {
      await this.cleanupPlayerConnection(
        previousRoomId,
        user.id,
        client.id,
        'leave',
        false,
      );
      try {
        await client.leave(previousRoomId);
      } catch (error) {
        await this.rollbackRoomTransition(
          client,
          previousRoomId,
          data.roomId,
          user.id,
          client.id,
        );
        await this.notifyPresenceChanged(user.id, previousPresenceStatus);
        throw error;
      }
    }

    client.data.roomId = data.roomId;

    this.socketPresenceService.register({
      namespace: 'game',
      roomId: data.roomId,
      userId: user.id,
      socketId: client.id,
    });
    await this.notifyPresenceChanged(user.id, previousPresenceStatus);

    client.emit('game:init', initData);
    this.gameService.handleGameStart(data.roomId);
  }

  private async rollbackRoomTransition(
    client: GameSocket,
    previousRoomId: string,
    nextRoomId: string,
    userId: string,
    clientId: string,
  ) {
    // 新しいゲーム状態とSocket.IO roomへの参加を取り消す。
    await this.cleanupPlayerConnection(nextRoomId, userId, clientId, 'leave');
    try {
      await client.leave(nextRoomId);
    } catch (error) {
      this.logger.error(
        `Failed to rollback new socket room { roomId: '${nextRoomId}', userId: '${userId}' }`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    // 旧ルームのゲーム状態とpresenceを復元する。旧roomからのleaveに
    // 失敗しているため、Socket.IO上では旧roomに残ったままになる。
    try {
      this.gameService.handleGameJoin(previousRoomId, userId);
      this.socketPresenceService.register({
        namespace: 'game',
        roomId: previousRoomId,
        userId,
        socketId: clientId,
      });
      client.data.roomId = previousRoomId;
    } catch (error) {
      this.logger.error(
        `Failed to restore previous game room { roomId: '${previousRoomId}', userId: '${userId}' }`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  @SubscribeMessage('game:leave')
  async handleLeave(
    @ConnectedSocket()
    client: GameSocket,
  ) {
    const roomId = client.data.roomId;
    if (!roomId || !client.data.user) return;

    // 明示的な離脱はリタイア扱い。切断猶予を待たずに即座に死亡させる。
    // 後続のawaitでtickが進んでしまう前に、同期的に処理しておく。
    await this.cleanupPlayerConnection(
      roomId,
      client.data.user.id,
      client.id,
      'retire',
    );

    try {
      await client.leave(roomId);
      client.data.roomId = undefined;
    } catch (error) {
      this.logger.error(
        `Failed to leave Socket.IO room { roomId: '${roomId}', userId: '${client.data.user.id}' }`,
        error instanceof Error ? error.stack : String(error),
      );
      client.data.roomId = undefined;
      client.disconnect();
    }
  }

  @SubscribeMessage('player:input')
  handleInput(
    @MessageBody()
    data: Parameters<ClientToServerEvents['player:input']>[0],
    @ConnectedSocket()
    client: GameSocket,
  ) {
    const roomId = client.data.roomId;
    if (!roomId || !client.data.user) return;

    this.gameService.handlePlayerInput(
      roomId,
      client.data.user.id,
      data.direction,
      data.seq,
    );
  }

  @SubscribeMessage('bomb:place')
  handleBombPlace(
    @MessageBody() data: Parameters<ClientToServerEvents['bomb:place']>[0],
    @ConnectedSocket()
    client: GameSocket,
  ) {
    const roomId = client.data.roomId;
    if (!roomId || !client.data.user) return;

    this.gameService.handleBombPlace(roomId, client.data.user.id);
  }

  async handleDisconnect(client: GameSocket) {
    const roomId = client.data.roomId;
    const userId = client.data.user?.id;
    if (!roomId || !userId) return;

    await this.cleanupPlayerConnection(roomId, userId, client.id, 'leave');
  }

  private async cleanupPlayerConnection(
    roomId: string,
    userId: string,
    clientId: string,
    mode: 'leave' | 'retire',
    notifyPresence = true,
  ): Promise<void> {
    const previousPresenceStatus = this.socketPresenceService.getStatus(userId);
    const remaining = this.socketPresenceService.unregister({
      namespace: 'game',
      roomId,
      userId,
      socketId: clientId,
    });
    if (remaining !== 0) return;

    if (mode === 'retire') {
      this.gameService.handleGameRetire(roomId, userId);
    } else if (mode == 'leave') {
      this.gameService.handleGameLeave(roomId, userId);
    }

    if (notifyPresence) {
      await this.notifyPresenceChanged(userId, previousPresenceStatus);
    }
  }

  // presence通知の失敗は、ゲーム状態の更新やSocket.IOルームの出入りを
  // 中断する理由にならない。呼び出し元へrejectを伝播させず、ログのみ残す。
  private async notifyPresenceChanged(
    userId: string,
    previousPresenceStatus: PresenceStatus,
  ): Promise<void> {
    try {
      await this.realtimeGateway.emitPresenceUpdatedIfChanged(
        userId,
        previousPresenceStatus,
      );
    } catch (error) {
      this.logger.error(
        `Failed to notify presence update { userId: '${userId}' }`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}

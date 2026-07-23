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
import { getSocketCorsOrigins } from '../websocket/socket-cors';
import type { GameSocket } from './game.types';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@ft_transcendence/shared/game-events.types';

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

    try {
      await client.join(data.roomId);
    } catch (error) {
      throw new WsException(
        error instanceof Error ? error.message : 'Cannot join the room',
      );
    }

    let initData: Parameters<ServerToClientEvents['game:init']>[0];
    try {
      initData = this.gameService.handleGameJoin(
        data.roomId,
        user.id,
        client.id,
      );
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
      this.cleanupPlayerConnection(previousRoomId, user.id, client.id);
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
    this.cleanupPlayerConnection(nextRoomId, userId, clientId);
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
      this.gameService.handleGameJoin(previousRoomId, userId, clientId);
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

    await client.leave(roomId);
    client.data.roomId = undefined;

    this.cleanupPlayerConnection(roomId, client.data.user.id, client.id);
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

  handleDisconnect(client: GameSocket) {
    const roomId = client.data.roomId;
    const userId = client.data.user?.id;
    if (!roomId || !userId) return;

    this.cleanupPlayerConnection(roomId, userId, client.id);
  }

  private cleanupPlayerConnection(
    roomId: string,
    userId: string,
    clientId: string,
  ): void {
    const remaining = this.socketPresenceService.unregister({
      namespace: 'game',
      roomId,
      userId,
      socketId: clientId,
    });

    if (remaining === 0) {
      this.gameService.handleGameLeave(roomId, userId, clientId);
    }
  }
}

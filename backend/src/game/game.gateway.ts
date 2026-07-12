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
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { SocketAuthService } from '../websocket/socket-auth.service';
import { SocketPresenceService } from '../websocket/socket-presence.service';
import { getSocketCorsOrigins } from '../websocket/socket-cors';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@ft_transcendence/shared/game-events.types';

interface ConnectionData {
  user: {
    id: string;
  };
  roomId?: string;
}

type GameSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  ConnectionData
>;

@WebSocketGateway({
  namespace: '/game',
  cors: { origin: getSocketCorsOrigins() },
})
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
      this.logger.warn(`[接続失敗] JWT未認証 socket=${client.id}`);
      return;
    }

    client.data.user = user;
    this.logger.log(`[接続成功] ユーザーId: ${user.id}`);
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
      this.logger.warn(
        `Failed to join room { roomId: '${data.roomId}', userId: ${user.id} }`,
        error instanceof Error ? error.stack : undefined,
      );
      client.emit('game:error', {
        message:
          error instanceof WsException ? error.message : 'Cannot join the room',
      });
      return;
    }

    if (previousRoomId && previousRoomId !== data.roomId) {
      const remaining = this.socketPresenceService.unregister({
        namespace: 'game',
        roomId: previousRoomId,
        userId: user.id,
        socketId: client.id,
      });
      if (remaining === 0) {
        this.gameService.handleGameLeave(user.id, client.id);
      }
      await client.leave(previousRoomId);
    }

    this.socketPresenceService.register({
      namespace: 'game',
      roomId: data.roomId,
      userId: user.id,
      socketId: client.id,
    });
    client.data.roomId = data.roomId;

    try {
      const initData = this.gameService.handleGameJoin(
        data.roomId,
        user.id,
        client.id,
      );
      client.emit('game:init', initData);
      this.gameService.handleGameStart(data.roomId);
    } catch (error) {
      this.socketPresenceService.unregister({
        namespace: 'game',
        roomId: data.roomId,
        userId: user.id,
        socketId: client.id,
      });
      client.data.roomId = previousRoomId;
      client.emit('game:error', {
        message:
          error instanceof Error ? error.message : 'Cannot join the room',
      });
    }
  }

  @SubscribeMessage('game:leave')
  async handleLeave(
    @ConnectedSocket()
    client: GameSocket,
  ) {
    const roomId = client.data.roomId;
    if (roomId) {
      await client.leave(roomId);
      client.data.roomId = undefined;
    }

    if (client.data.user && roomId) {
      const remaining = this.socketPresenceService.unregister({
        namespace: 'game',
        roomId,
        userId: client.data.user.id,
        socketId: client.id,
      });
      if (remaining === 0) {
        this.gameService.handleGameLeave(client.data.user.id, client.id);
      }
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

  handleDisconnect(client: GameSocket) {
    const roomId = client.data.roomId;
    const userId = client.data.user?.id;
    if (!roomId || !userId) return;

    this.socketPresenceService.unregister({
      namespace: 'game',
      roomId,
      userId,
      socketId: client.id,
    });
    this.socketPresenceService.scheduleIfInactive(
      { namespace: 'game', roomId, userId },
      2000,
      () => this.gameService.handleGameLeave(userId, client.id),
    );
  }
}

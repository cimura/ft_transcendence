import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
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

    let initData;
    try {
      initData = this.gameService.handleGameJoin(
        data.roomId,
        user.id,
        client.id,
      );
    } catch (error) {
      this.logger.warn(
        `Permission Denied: Failed to join room { roomId: '${data.roomId}', userId: '${user.id}' }`,
      );
      client.emit('game:error', {
        message:
          error instanceof Error ? error.message : 'Cannot join the room',
      });
      return;
    }

    const previousRoomId = client.data.roomId;
    if (previousRoomId && previousRoomId !== data.roomId) {
      const remaining = this.socketPresenceService.unregister({
        namespace: 'game',
        roomId: previousRoomId,
        userId: user.id,
        socketId: client.id,
      });
      if (remaining === 0) {
        this.gameService.handleGameLeave(previousRoomId, user.id, client.id);
      }
      await client.leave(previousRoomId);
    }

    client.data.roomId = data.roomId;

    try {
      await client.join(data.roomId);
    } catch (error) {
      this.logger.warn(
        `System Error: Failed to join room { roomId: '${data.roomId}', userId: '${user.id}' }`,
      );
      client.emit('game:error', {
        message:
          error instanceof Error ? error.message : 'Cannot join the room',
      });
      return;
    }

    this.socketPresenceService.register({
      namespace: 'game',
      roomId: data.roomId,
      userId: user.id,
      socketId: client.id,
    });

    client.emit('game:init', initData);
    this.gameService.handleGameStart(data.roomId);
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

    const remaining = this.socketPresenceService.unregister({
      namespace: 'game',
      roomId,
      userId: client.data.user.id,
      socketId: client.id,
    });
    if (remaining === 0) {
      this.gameService.handleGameLeave(roomId, client.data.user.id, client.id);
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

    const remaining = this.socketPresenceService.unregister({
      namespace: 'game',
      roomId,
      userId,
      socketId: client.id,
    });
    if (remaining === 0) {
      this.gameService.handleGameLeave(roomId, userId, client.id);
    }
  }
}

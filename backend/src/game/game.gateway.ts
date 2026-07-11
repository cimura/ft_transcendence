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
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { SocketAuthService } from '../websocket/socket-auth.service';
import { SocketPresenceService } from '../websocket/socket-presence.service';
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
  cors: { origin: '*' },
})
export class GameGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
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
      console.log(`[接続失敗] JWT未認証`);
      return;
    }

    client.data.user = user;
    console.log(`[接続成功] ユーザーId: ${client.data.user.id}`);
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
    if (previousRoomId && previousRoomId !== data.roomId) {
      const remaining = this.socketPresenceService.unregister({
        namespace: 'game',
        roomId: previousRoomId,
        userId: user.id,
        socketId: client.id,
      });
      if (remaining === 0) {
        this.gameService.handleGameLeave(user.id);
      }
      await client.leave(previousRoomId);
    }

    await client.join(data.roomId);
    this.socketPresenceService.register({
      namespace: 'game',
      roomId: data.roomId,
      userId: user.id,
      socketId: client.id,
    });
    client.data.roomId = data.roomId;

    const initData = this.gameService.handleGameJoin(data.roomId, user.id);
    client.emit('game:init', initData);

    console.log(
      `[ルーム参加] ユーザーID: ${user.id} が 部屋: ${data.roomId} に参加します`,
    );
  }

  @SubscribeMessage('game:leave')
  async handleLeave(
    @ConnectedSocket()
    client: GameSocket,
  ) {
    const roomId = client.data.roomId;
    const userId = client.data.user?.id;
    if (!roomId || !userId) return;

    await client.leave(roomId);
    client.data.roomId = undefined;

    const remaining = this.socketPresenceService.unregister({
      namespace: 'game',
      roomId,
      userId,
      socketId: client.id,
    });
    if (remaining === 0) {
      this.gameService.handleGameLeave(userId);
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
      () => this.gameService.handleGameLeave(userId, roomId),
    );
  }
}

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
import { JwtService } from '@nestjs/jwt';
import { GameService } from './game.service';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@ft_transcendence/shared/game-events.types';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

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
    private readonly jwtService: JwtService,
  ) {}

  afterInit(server: Server<ClientToServerEvents, ServerToClientEvents>) {
    this.gameService.setServer(server);
  }

  handleConnection(client: GameSocket) {
    try {
      const authHeader = client.handshake.auth.token as string | undefined;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('No token or invalid format');
      }
      const token = authHeader.split(' ')[1];
      const payload = this.jwtService.verify<JwtPayload>(token);
      client.data.user = {
        id: payload.sub,
      };
      console.log(`[接続成功] ユーザーId: ${client.data.user.id}`);
    } catch {
      client.disconnect();
      console.log(`[接続失敗] JWT未認証`);
    }
  }

  @SubscribeMessage('game:join')
  async handleJoin(
    @MessageBody() data: Parameters<ClientToServerEvents['game:join']>[0],
    @ConnectedSocket()
    client: GameSocket,
  ) {
    const user = client.data.user;
    if (!user) return;

    try {
      const initData = this.gameService.handleGameJoin(data.roomId, user.id);

      const previousRoomId = client.data.roomId;
      if (previousRoomId && previousRoomId !== data.roomId) {
        console.log(`[LeavePrevious] roomId: ${previousRoomId}`);
        await client.leave(previousRoomId);
      }

      await client.join(data.roomId);
      client.data.roomId = data.roomId;

      client.emit('game:init', initData);
      console.log(`[Join] roomId: ${data.roomId} UserId: ${user.id}`);

      // ゲーム開始条件が満たされた場合のみゲームループを開始させる
      this.gameService.handleGameStart(data.roomId);
    } catch (error) {
      client.emit('game:error', {
        message:
          error instanceof Error ? error.message : 'Cannot join the room',
      });
      console.log(
        `[Rejected] roomId: ${data.roomId} UserId: ${user.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
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

    if (client.data.user) {
      this.gameService.handleGameLeave(client.data.user.id);
    }
    console.log(`[game:leave] useId: ${client.data.user.id}`);
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
    if (client.data.user) {
      this.gameService.handleGameLeave(client.data.user.id);
      console.log(`[disconnect] useId: ${client.data.user.id}`);
    }
  }
}

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
import {
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
  handleJoin(
    @MessageBody() data: Parameters<ClientToServerEvents['game:join']>[0],
    @ConnectedSocket()
    client: GameSocket,
  ) {
    const user = client.data.user;
    if (!user) {
      console.error('未認証のユーザーからのjoinリクエストです');
      client.disconnect();
      return;
    }

    // TODO: ユーザーIDを元に送られてきた roomId のルームに参加しているかを調べる
    // === 実装例 ===
    // const participant = await this.prisma.roomParticipant.findUnique({
    //   where: {
    //     roomId_userId: { roomId: data.roomId, userId: user.id },
    //   },
    //   include: {
    //     user: true, // (usernameを取るためにリレーションを含める)
    //   },
    // });
    // if (!participant) {
    //   console.error('このルームの参加権限がありません');
    //   return;
    // }

    console.log(
      `[ルーム参加] ユーザーID: ${user.id} が 部屋: ${data.roomId} に参加します`,
    );

    client.join(data.roomId);
    client.data.roomId = data.roomId;

    // TODO: 'test-username' を上でデータベースから取ってきたものにする
    this.gameService.addPlayer(data.roomId, user.id, 'test-username');

    const room = this.gameService.getOrCreateRoom(data.roomId);

    client.emit('game:init', {
      yourId: user.id,
      serverTime: Date.now(),
      mapRevision: room.mapRevision,
      map: room.map,
      players: room.players,
      bombs: room.bombs,
      phase: room.phase,
    });

    if (Object.keys(room.players).length >= 2 && room.phase === 'waiting') {
      this.gameService.startGameLoop(data.roomId);
    }
  }

  @SubscribeMessage('game:leave')
  handleLeave(
    @MessageBody()
    data: Parameters<ClientToServerEvents['game:leave']>[0],
    @ConnectedSocket()
    client: GameSocket,
  ) {
    void data;
    void client;
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
    const roomId = Array.from(client.rooms).find((r) => r !== client.id);
    if (!roomId || !client.data.user) return;

    this.gameService.handleBombPlace(roomId, client.data.user.id);
  }

  handleDisconnect(client: GameSocket) {
    if (client.data.user) {
      this.gameService.removePlayer(client.data.user.id);
    }
  }
}

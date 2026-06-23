import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { Direction } from '@ft_transcendence/shared/game-events.types';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class GameGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  constructor(private readonly gameService: GameService) {}

  afterInit(server: Server) {
    this.gameService.setServer(server);
  }

  @SubscribeMessage('game:join')
  handleJoin(
    @MessageBody() data: { roomId: string; username: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, username } = data;

    client.join(roomId);

    this.gameService.addPlayer(
      roomId,
      client.id,
      username || `Player-${client.id.slice(0, 4)}`,
    );

    const room = this.gameService.getOrCreateRoom(roomId);

    client.emit('game:init', {
      yourId: client.id,
      serverTime: Date.now(),
      mapRevision: room.mapRevision,
      map: room.map,
      players: room.players,
      bombs: room.bombs,
      phase: room.phase,
    });

    // ★ プレイヤーが2人以上揃ったらゲームループを開始
    if (Object.keys(room.players).length >= 2 && room.phase === 'waiting') {
      this.gameService.startGameLoop(roomId);
    }
  }

  @SubscribeMessage('player:input')
  handleInput(
    @MessageBody()
    data: { direction: Direction | null; seq: number; clientTime: number },
    @ConnectedSocket() client: Socket,
  ) {
    const roomId = Array.from(client.rooms).find((r) => r !== client.id);
    if (!roomId) return;

    this.gameService.handlePlayerInput(
      roomId,
      client.id,
      data.direction,
      data.seq,
    );
  }

  @SubscribeMessage('bomb:place')
  handleBombPlace(
    @MessageBody() data: { seq: number; clientTime: number },
    @ConnectedSocket() client: Socket,
  ) {
    const roomId = Array.from(client.rooms).find((r) => r !== client.id);
    if (!roomId) return;

    this.gameService.handleBombPlace(roomId, client.id);
  }

  handleDisconnect(client: Socket) {
    this.gameService.removePlayer(client.id);
  }
}

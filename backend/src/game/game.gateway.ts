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

  // 起動時にServiceへServerインスタンスを渡す
  afterInit(server: Server) {
    this.gameService.setServer(server);
  }

  // ルームへの参加
  @SubscribeMessage('game:join')
  handleJoin(
    @MessageBody() data: { roomId: string; username: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, username } = data;

    // Socket.IOのルーム機能でクライアントをグループ分け
    client.join(roomId);

    // サービスにプレイヤーを登録
    this.gameService.addPlayer(
      roomId,
      client.id,
      username || `Player-${client.id.slice(0, 4)}`,
    );

    const room = this.gameService.getOrCreateRoom(roomId);

    // 1. 参加したクライアントに初期状態を通知
    client.emit('game:init', {
      yourId: client.id,
      serverTime: Date.now(),
      mapRevision: room.mapRevision,
      map: room.map,
      players: room.players,
      bombs: room.bombs,
      phase: room.phase,
    });

    // 2. 開発用に、2人以上揃ったら自動でゲームループを開始させる例
    if (Object.keys(room.players).length >= 1 && room.phase === 'waiting') {
      this.gameService.startGameLoop(roomId);
    }
  }

  // プレイヤーからの入力イベント
  @SubscribeMessage('player:input')
  handleInput(
    @MessageBody()
    data: { direction: Direction | null; seq: number; clientTime: number },
    @ConnectedSocket() client: Socket,
  ) {
    // クライアントがどのルームにいるかをソケットのRoomsから特定（あるいはペイロードにroomIdを含めてもOK）
    const roomId = Array.from(client.rooms).find((r) => r !== client.id);
    if (!roomId) return;

    // 入力状態をサービスにパッシング
    this.gameService.handlePlayerInput(
      roomId,
      client.id,
      data.direction,
      data.seq,
    );
  }

  // 切断時のクリーンアップ
  handleDisconnect(client: Socket) {
    // 必要に応じてルームからの削除や、誰もいなくなった場合のタイマーストップ（stopGameLoop）をここに実装
  }
}

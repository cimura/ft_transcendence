// 1. define RoomsGateway
// 2. log when a socket connects
// 3. log when a socket disconnects

import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { RoomsService } from './rooms.service';

@WebSocketGateway()
export class RoomsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly roomsService: RoomsService) {}

  handleConnection(client: Socket) {
    console.log(`[RoomsGateway] connected: ${client.id}`);
  }
  handleDisconnect(client: Socket) {
    console.log(`[RoomsGateway] disconnected: ${client.id}`);
  }
  @SubscribeMessage('lobby:join')
  async handleJoinLobby(@ConnectedSocket() client: Socket) {
    await client.join('lobby');
    const rooms = await this.roomsService.findAll('waiting');
    client.emit('lobby:rooms', rooms);
    console.log(`[RoomsGateway] lobby:join ${client.id}`);
    console.log(`[RoomsGateway] sent lobby:rooms count=${rooms.length}`);
  }
  @SubscribeMessage('lobby:leave')
  async handleLeaveLobby(@ConnectedSocket() client: Socket) {
    await client.leave('lobby');
    console.log(`[RoomsGateway] lobby:leave ${client.id}`);
  }
}

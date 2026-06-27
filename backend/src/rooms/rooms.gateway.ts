// 1. define RoomsGateway
// 2. log when a socket connects
// 3. log when a socket disconnects

import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  WebSocketServer,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { RoomsService } from './rooms.service';

@WebSocketGateway()
export class RoomsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

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

  emitRoomCreated(room: Awaited<ReturnType<RoomsService['create']>>) {
    console.log(`[RoomsGateway] room:created ${room.id}`);
    this.server.to('lobby').emit('room:created', room);
  }

  emitRoomUpdated(room: Awaited<ReturnType<RoomsService['join']>>) {
    console.log(`[RoomsGateway] room:updated ${room.id}`);
    this.server.to('lobby').emit('room:updated', room);
  }

  emitRoomDeleted(roomId: string) {
    console.log(`[RoomsGateway] room:deleted ${roomId}`);
    this.server.to('lobby').emit('room:deleted', { roomId });
  }
}

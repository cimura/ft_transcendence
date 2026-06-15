// 1. define RoomsGateway
// 2. log when a socket connects
// 3. log when a socket disconnects

import { WebSocketGateway, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets'
import { Socket } from 'socket.io'

@WebSocketGateway()
export class RoomsGateway implements OnGatewayConnection, OnGatewayDisconnect{
    handleConnection(client: Socket) {
        console.log(`[RoomsGateway] connected: ${client.id}`);
    }
    handleDisconnection(client: Socket) {
        console.log(`[RoomsGateway] connected: ${client.id}`);
    }
}


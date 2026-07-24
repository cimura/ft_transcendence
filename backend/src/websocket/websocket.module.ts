import { Module } from '@nestjs/common';
import { SocketAuthService } from './socket-auth.service';
import { SocketPresenceService } from './socket-presence.service';
import { RealtimeGateway } from './realtime.gateway';

@Module({
  providers: [SocketAuthService, SocketPresenceService, RealtimeGateway],
  exports: [SocketAuthService, SocketPresenceService, RealtimeGateway],
})
export class AppWebsocketModule {}

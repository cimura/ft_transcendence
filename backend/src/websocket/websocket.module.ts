import { Module } from '@nestjs/common';
import { SocketAuthService } from './socket-auth.service';
import { SocketPresenceService } from './socket-presence.service';

@Module({
  providers: [SocketAuthService, SocketPresenceService],
  exports: [SocketAuthService, SocketPresenceService],
})
export class AppWebsocketModule {}

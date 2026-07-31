import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma.service';
import { GamesModule } from '../games/games.module';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { RoomsInvitationService } from './rooms-invitation.service';
import { RoomsChatService } from './rooms-chat.service';
import { RoomsLobbyService } from './rooms-lobby.service';
import { RoomsGateway } from './rooms.gateway';
import { AppWebsocketModule } from '../websocket/websocket.module';
import { RoomsStateService } from './rooms-state.service';

@Module({
  imports: [GamesModule, AppWebsocketModule, EventEmitterModule.forRoot()],
  controllers: [RoomsController],
  providers: [
    RoomsService,
    RoomsInvitationService,
    RoomsChatService,
    RoomsLobbyService,
    PrismaService,
    RoomsGateway,
    RoomsStateService,
  ],
  exports: [RoomsStateService],
})
export class RoomsModule {}

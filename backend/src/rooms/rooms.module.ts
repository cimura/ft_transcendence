import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { GamesModule } from '../games/games.module';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { RoomsGateway } from './rooms.gateway';
import { AppWebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [GamesModule, AppWebsocketModule],
  controllers: [RoomsController],
  providers: [RoomsService, PrismaService, RoomsGateway],
})
export class RoomsModule {}

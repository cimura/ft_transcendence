import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { GamesModule } from '../games/games.module';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { RoomsGateway } from './rooms.gateway';

@Module({
  imports: [GamesModule],
  controllers: [RoomsController, RoomsGateway],
  providers: [RoomsService, PrismaService],
})
export class RoomsModule {}

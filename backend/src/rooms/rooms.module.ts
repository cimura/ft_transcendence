import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { GamesModule } from '../games/games.module';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';

@Module({
  imports: [GamesModule],
  controllers: [RoomsController],
  providers: [RoomsService, PrismaService],
})
export class RoomsModule {}

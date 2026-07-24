import { Module } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { FriendsController } from './friends.controller';
import { PrismaService } from 'src/prisma.service';
import { AppWebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [AppWebsocketModule],
  providers: [FriendsService, PrismaService],
  controllers: [FriendsController],
})
export class FriendsModule {}

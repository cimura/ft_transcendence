import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { RoomsModule } from '../rooms/rooms.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [PrismaModule, RoomsModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
})
export class NotificationsModule {}

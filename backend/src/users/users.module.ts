import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { UploadsModule } from '../uploads/uploads.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [UploadsModule],
  controllers: [UsersController],
  providers: [UsersService, PrismaService],
  exports: [UsersService],
})
export class UsersModule {}

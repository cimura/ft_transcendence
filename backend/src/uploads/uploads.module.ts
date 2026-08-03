import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { UploadsService } from './uploads.service';

@Module({
  providers: [UploadsService, PrismaService],
  exports: [UploadsService],
})
export class UploadsModule {}

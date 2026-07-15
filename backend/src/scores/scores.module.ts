import { Module } from '@nestjs/common';
import { ScoresController } from './scores.controller';
import { ScoresService } from './scores.service';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [ScoresController],
  providers: [ScoresService, PrismaService],
  exports: [ScoresService],
})
export class ScoresModule {}

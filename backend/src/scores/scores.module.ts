import { Module } from '@nestjs/common';
import { ScoreController } from './scores.controller';
import { ScoreService } from './scores.service';

@Module({
  controllers: [ScoreController],
  providers: [ScoreService],
})
export class ScoreModule {}

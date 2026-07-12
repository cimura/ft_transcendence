import { Module } from '@nestjs/common';
import { ScoresModule } from '../scores/scores.module';
import { GameService } from './game.service';

@Module({
  imports: [ScoresModule],
  providers: [GameService],
  exports: [GameService],
})
export class GameModule {}

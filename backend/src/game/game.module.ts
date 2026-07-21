import { Module } from '@nestjs/common';
import { ScoresModule } from '../scores/scores.module';
import { RoomsModule } from '../rooms/rooms.module';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';

@Module({
  imports: [ScoresModule, RoomsModule],
  providers: [GameService, GameGateway],
  exports: [GameService],
})
export class GameModule {}

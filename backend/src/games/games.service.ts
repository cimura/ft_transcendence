import { Injectable, NotFoundException } from '@nestjs/common';
import { BOMBERMAN_GAME_ID, bombermanGame } from './games.constants';

@Injectable()
export class GamesService {
  findById(gameId: string) {
    if (gameId === BOMBERMAN_GAME_ID) {
      return bombermanGame;
    }

    throw new NotFoundException('Game master not found');
  }
}

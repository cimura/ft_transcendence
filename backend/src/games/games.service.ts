import { Injectable, NotFoundException } from '@nestjs/common';
import { BOMBERMAN_GAME_ID, bombermanGame, games } from './games.constants';

@Injectable()
export class GamesService {
  findAll() {
    return games.map(({ id, name, description, supportedPlayers }) => ({
      id,
      name,
      description,
      supportedPlayers,
    }));
  }

  findBomberman() {
    return bombermanGame;
  }

  findById(gameId: string) {
    if (gameId === BOMBERMAN_GAME_ID) {
      return bombermanGame;
    }

    throw new NotFoundException('Game master not found');
  }
}

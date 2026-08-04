import { NotFoundException } from '@nestjs/common';
import { BOMBERMAN_GAME_ID } from './games.constants';
import { GamesService } from './games.service';

describe('GamesService', () => {
  let service: GamesService;

  beforeEach(() => {
    service = new GamesService();
  });

  it('returns the bomberman master data', () => {
    expect(service.findById(BOMBERMAN_GAME_ID)).toEqual(
      expect.objectContaining({
        id: BOMBERMAN_GAME_ID,
        name: 'Bomberman',
        supportedPlayers: [2, 3, 4],
        settings: expect.objectContaining({
          mapId: 'classic',
          maxMessages: 50,
        }),
      }),
    );
  });

  it('throws when a game id does not exist', () => {
    expect(() => service.findById('unknown')).toThrow(NotFoundException);
  });
});

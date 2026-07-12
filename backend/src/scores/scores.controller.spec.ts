import { Test, TestingModule } from '@nestjs/testing';
import { ScoresController } from './scores.controller';
import { ScoresService } from './scores.service';

describe('ScoresController', () => {
  let controller: ScoresController;
  let scoresService: {
    getMatchHistory: jest.Mock;
    getRankings: jest.Mock;
  };

  beforeEach(async () => {
    scoresService = {
      getMatchHistory: jest.fn().mockResolvedValue({
        data: [],
        hasMore: false,
        total: 0,
        page: 1,
      }),
      getRankings: jest.fn().mockResolvedValue({ data: [] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScoresController],
      providers: [
        {
          provide: ScoresService,
          useValue: scoresService,
        },
      ],
    }).compile();

    controller = module.get<ScoresController>(ScoresController);
  });

  it('uses default pagination when query params are omitted', async () => {
    await controller.getMatchHistory('user-1', {});

    expect(scoresService.getMatchHistory).toHaveBeenCalledWith('user-1', 1, 20);
  });

  it('passes validated pagination query params to the service', async () => {
    await controller.getMatchHistory('user-1', { page: 2, limit: 50 });

    expect(scoresService.getMatchHistory).toHaveBeenCalledWith('user-1', 2, 50);
  });

  it('uses default ranking limit when query params are omitted', async () => {
    await controller.getRankings({});

    expect(scoresService.getRankings).toHaveBeenCalledWith(20);
  });

  it('passes ranking limit query params to the service', async () => {
    await controller.getRankings({ limit: 50 });

    expect(scoresService.getRankings).toHaveBeenCalledWith(50);
  });
});

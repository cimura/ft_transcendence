import { Test, TestingModule } from '@nestjs/testing';
import { ScoresController } from './scores.controller';
import { ScoresService } from './scores.service';

describe('ScoresController', () => {
  let controller: ScoresController;
  let scoresService: {
    getMatchHistory: jest.Mock;
    getRankings: jest.Mock;
    getUserStats: jest.Mock;
    getGalacticGuide: jest.Mock;
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
      getUserStats: jest.fn().mockResolvedValue({
        totalGames: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        kills: 0,
        winRate: 0,
        maxWinStreak: 0,
      }),
      getGalacticGuide: jest.fn().mockResolvedValue({
        progression: {
          level: 1,
          title: 'Stranded Earthling',
          totalXp: 0,
          currentLevelXp: 0,
          levelXpRequired: 50,
          xpToNextLevel: 50,
          progressPercent: 0,
        },
        unlockedCount: 0,
        totalCount: 6,
        achievements: [],
      }),
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

  it('passes user ID to the statistics service', async () => {
    await controller.getUserStats('user-1');

    expect(scoresService.getUserStats).toHaveBeenCalledWith('user-1');
  });

  it('passes user ID to the Galactic Guide service', async () => {
    await controller.getGalacticGuide('user-1');

    expect(scoresService.getGalacticGuide).toHaveBeenCalledWith('user-1');
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ScoresService } from './scores.service';
import { PrismaService } from '../prisma.service';
import { MatchResult } from '../generated/prisma/enums';

describe('ScoresService', () => {
  let service: ScoresService;
  let prisma: {
    $transaction: jest.Mock;
    matchParticipant: {
      findMany: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
      matchParticipant: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoresService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<ScoresService>(ScoresService);
  });

  it('maps match participants to paginated match history', async () => {
    const userId = 'user-1';
    const finishedAt = new Date('2026-06-25T09:12:20.525Z');
    const participant = {
      id: 'participant-1',
      matchId: 'match-1',
      userId,
      result: MatchResult.WIN,
      kills: 1,
      score: 100,
      rank: 1,
      match: {
        id: 'match-1',
        gameType: 'Bomberman',
        finishedAt,
        createdAt: finishedAt,
        participants: [
          {
            id: 'participant-1',
            matchId: 'match-1',
            userId,
            result: MatchResult.WIN,
            kills: 1,
            score: 100,
            rank: 1,
            user: {
              id: userId,
              username: 'current',
              displayName: null,
            },
          },
          {
            id: 'participant-2',
            matchId: 'match-1',
            userId: 'user-2',
            result: MatchResult.LOSS,
            kills: null,
            score: 40,
            rank: 2,
            user: {
              id: 'user-2',
              username: 'opponent',
              displayName: 'Opponent Display',
            },
          },
        ],
      },
    };

    prisma.$transaction.mockResolvedValue([[participant], 1]);

    await expect(service.getMatchHistory(userId, 1, 20)).resolves.toEqual({
      data: [
        {
          id: 'match-1',
          result: 'win',
          opponents: ['Opponent Display'],
          playedAt: '2026-06-25T09:12:20.525Z',
          gameType: 'Bomberman',
          kills: 1,
        },
      ],
      hasMore: false,
      total: 1,
      page: 1,
    });

    expect(prisma.matchParticipant.findMany).toHaveBeenCalledWith({
      where: { userId },
      skip: 0,
      take: 20,
      orderBy: [
        {
          match: {
            finishedAt: 'desc',
          },
        },
        { matchId: 'desc' },
      ],
      include: {
        match: {
          select: {
            id: true,
            gameType: true,
            finishedAt: true,
            participants: {
              select: {
                userId: true,
                user: {
                  select: {
                    username: true,
                    displayName: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    expect(prisma.matchParticipant.count).toHaveBeenCalledWith({
      where: { userId },
    });
  });

  it('omits kills when the stored value is null', async () => {
    const userId = 'user-1';
    const finishedAt = new Date('2026-06-25T09:12:20.525Z');
    const participant = {
      id: 'participant-1',
      matchId: 'match-1',
      userId,
      result: MatchResult.DRAW,
      kills: null,
      score: null,
      rank: null,
      match: {
        id: 'match-1',
        gameType: 'Bomberman',
        finishedAt,
        createdAt: finishedAt,
        participants: [
          {
            id: 'participant-1',
            matchId: 'match-1',
            userId,
            result: MatchResult.DRAW,
            kills: null,
            score: null,
            rank: null,
            user: {
              id: userId,
              username: 'current',
              displayName: null,
            },
          },
          {
            id: 'participant-2',
            matchId: 'match-1',
            userId: 'user-2',
            result: MatchResult.DRAW,
            kills: null,
            score: null,
            rank: null,
            user: {
              id: 'user-2',
              username: 'opponent',
              displayName: null,
            },
          },
        ],
      },
    };

    prisma.$transaction.mockResolvedValue([[participant], 21]);

    const result = await service.getMatchHistory(userId, 2, 20);

    expect(result).toEqual({
      data: [
        {
          id: 'match-1',
          result: 'draw',
          opponents: ['opponent'],
          playedAt: '2026-06-25T09:12:20.525Z',
          gameType: 'Bomberman',
          kills: undefined,
        },
      ],
      hasMore: false,
      total: 21,
      page: 2,
    });
  });
});

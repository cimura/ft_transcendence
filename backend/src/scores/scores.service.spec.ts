import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ScoresService } from './scores.service';
import { PrismaService } from '../prisma.service';
import { MatchResult } from '../generated/prisma/enums';

describe('ScoresService', () => {
  let service: ScoresService;
  let prisma: {
    $transaction: jest.Mock;
    $queryRaw: jest.Mock;
    user: {
      findUnique: jest.Mock;
    };
    match: {
      create: jest.Mock;
    };
    matchParticipant: {
      findMany: jest.Mock;
      count: jest.Mock;
    };
    userAchievement: {
      createMany: jest.Mock;
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
      $queryRaw: jest.fn(),
      user: {
        findUnique: jest.fn(),
      },
      match: {
        create: jest.fn(),
      },
      matchParticipant: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      userAchievement: {
        createMany: jest.fn(),
        findMany: jest.fn(),
      },
    };

    prisma.$transaction.mockImplementation(
      async (
        operation:
          ((tx: typeof prisma) => Promise<unknown>) | Promise<unknown>[],
      ) => {
        if (typeof operation === 'function') {
          return operation(prisma);
        }
        return Promise.all(operation);
      },
    );

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

  it('aggregates user statistics from match results', async () => {
    const userId = 'user-1';

    prisma.user.findUnique.mockResolvedValue({ id: userId });
    prisma.matchParticipant.findMany.mockResolvedValue([
      { result: MatchResult.WIN, kills: 2 },
      { result: MatchResult.WIN, kills: 3 },
      { result: MatchResult.DRAW, kills: null },
      { result: MatchResult.WIN, kills: 1 },
      { result: MatchResult.LOSS, kills: 0 },
    ]);

    await expect(service.getUserStats(userId)).resolves.toEqual({
      totalGames: 5,
      wins: 3,
      losses: 1,
      draws: 1,
      kills: 6,
      winRate: 60,
      maxWinStreak: 2,
    });
  });

  it('returns zero statistics for an existing user without matches', async () => {
    const userId = 'user-without-matches';

    prisma.user.findUnique.mockResolvedValue({ id: userId });
    prisma.matchParticipant.findMany.mockResolvedValue([]);

    await expect(service.getUserStats(userId)).resolves.toEqual({
      totalGames: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      kills: 0,
      winRate: 0,
      maxWinStreak: 0,
    });
  });

  it('throws NotFoundException when the user does not exist', async () => {
    const userId = 'unknown-user';

    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.getUserStats(userId)).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.matchParticipant.findMany).not.toHaveBeenCalled();
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
          opponents: ['opponent'],
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

  it('records game end rankings as match participants', async () => {
    const finishedAt = new Date('2026-06-25T09:12:20.525Z');
    prisma.matchParticipant.findMany
      .mockResolvedValueOnce([{ result: MatchResult.WIN, kills: 1 }])
      .mockResolvedValueOnce([{ result: MatchResult.LOSS, kills: 0 }]);

    await service.recordMatchResult({
      gameType: 'Bomberman',
      finishedAt,
      winnerId: 'user-1',
      isDraw: false,
      rankings: [
        {
          playerId: 'user-1',
          alive: true,
          blocksDestroyed: 3,
          bombsPlaced: 2,
          kills: 1,
          survivalTime: 12000,
        },
        {
          playerId: 'user-2',
          alive: false,
          blocksDestroyed: 1,
          bombsPlaced: 1,
          kills: 0,
          survivalTime: 8000,
        },
      ],
    });

    expect(prisma.match.create).toHaveBeenCalledWith({
      data: {
        gameType: 'Bomberman',
        finishedAt,
        participants: {
          create: [
            {
              userId: 'user-1',
              result: MatchResult.WIN,
              kills: 1,
              score: null,
              rank: 1,
            },
            {
              userId: 'user-2',
              result: MatchResult.LOSS,
              kills: 0,
              score: null,
              rank: 2,
            },
          ],
        },
      },
    });

    expect(prisma.userAchievement.createMany).toHaveBeenNthCalledWith(1, {
      data: [
        {
          userId: 'user-1',
          achievementId: 'first_match',
        },
        {
          userId: 'user-1',
          achievementId: 'first_win',
        },
      ],
      skipDuplicates: true,
    });

    expect(prisma.userAchievement.createMany).toHaveBeenNthCalledWith(2, {
      data: [
        {
          userId: 'user-2',
          achievementId: 'first_match',
        },
      ],
      skipDuplicates: true,
    });
  });

  it('aggregates rankings from stored match participants', async () => {
    prisma.$queryRaw.mockResolvedValue([
      {
        userId: 'user-1',
        username: 'alice',
        avatarUrl: '/avatars/default-1.svg',
        totalGames: 2,
        wins: 1,
        losses: 0,
        draws: 1,
        kills: 2,
        points: 4,
      },
      {
        userId: 'user-2',
        username: 'bob',
        avatarUrl: null,
        totalGames: 1,
        wins: 1,
        losses: 0,
        draws: 0,
        kills: 1,
        points: 3,
      },
    ]);

    await expect(service.getRankings(10)).resolves.toEqual({
      data: [
        {
          userId: 'user-1',
          username: 'alice',
          avatarUrl: '/avatars/default-1.svg',
          totalGames: 2,
          wins: 1,
          losses: 0,
          draws: 1,
          kills: 2,
          points: 4,
          rank: 1,
          winRate: 50,
        },
        {
          userId: 'user-2',
          username: 'bob',
          avatarUrl: null,
          totalGames: 1,
          wins: 1,
          losses: 0,
          draws: 0,
          kills: 1,
          points: 3,
          rank: 2,
          winRate: 100,
        },
      ],
    });
  });

  it('returns Galactic Guide progression and achievements', async () => {
    const userId = 'user-1';
    const firstMatchUnlockedAt = new Date('2026-08-01T10:00:00.000Z');
    const firstWinUnlockedAt = new Date('2026-08-01T10:05:00.000Z');

    prisma.user.findUnique.mockResolvedValue({ id: userId });
    prisma.matchParticipant.findMany.mockResolvedValue([
      { result: MatchResult.WIN, kills: 2 }, // 40 XP
      { result: MatchResult.LOSS, kills: 0 }, // 10 XP
    ]);
    prisma.userAchievement.findMany.mockResolvedValue([
      {
        achievementId: 'first_match',
        unlockedAt: firstMatchUnlockedAt,
      },
      {
        achievementId: 'first_win',
        unlockedAt: firstWinUnlockedAt,
      },
    ]);

    const result = await service.getGalacticGuide(userId);

    expect(result.progression).toEqual({
      level: 2,
      title: 'Mostly Harmless Traveller',
      totalXp: 50,
      currentLevelXp: 0,
      levelXpRequired: 70,
      xpToNextLevel: 70,
      progressPercent: 0,
    });

    expect(result.unlockedCount).toBe(2);
    expect(result.totalCount).toBe(6);

    expect(result.achievements[0]).toEqual({
      id: 'first_match',
      name: 'Mostly Harmless',
      description: '初めての戦いを完了する',
      icon: 'planet',
      category: 'JOURNEY',
      progress: 2,
      target: 1,
      unlocked: true,
      unlockedAt: '2026-08-01T10:00:00.000Z',
    });

    expect(result.achievements).toContainEqual(
      expect.objectContaining({
        id: 'games_10',
        progress: 2,
        target: 10,
        unlocked: false,
        unlockedAt: null,
      }),
    );
  });

  it('throws NotFoundException when Galactic Guide user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.getGalacticGuide('unknown-user')).rejects.toThrow(
      NotFoundException,
    );

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('shows achievements completed before achievement tracking was added', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
    prisma.matchParticipant.findMany.mockResolvedValue([
      { result: MatchResult.WIN, kills: 0 },
      { result: MatchResult.LOSS, kills: 0 },
    ]);
    prisma.userAchievement.findMany.mockResolvedValue([]);

    const result = await service.getGalacticGuide('user-1');

    expect(result.achievements).toContainEqual(
      expect.objectContaining({
        id: 'first_match',
        unlocked: true,
        unlockedAt: null,
      }),
    );

    expect(result.achievements).toContainEqual(
      expect.objectContaining({
        id: 'first_win',
        unlocked: true,
        unlockedAt: null,
      }),
    );

    expect(result.unlockedCount).toBe(2);
  });
});

import { Injectable, NotFoundException } from '@nestjs/common';
import { MatchHistoryResponseDto } from './dto/match-history.dto';
import { RankingsResponseDto } from './dto/ranking.dto';
import { PrismaService } from '../prisma.service';
import { MatchResult } from '../generated/prisma/enums';
import { Prisma } from '../generated/prisma/client.js';
import type { PlayerRanking } from '@ft_transcendence/shared/game-events.types';
import { UserStatsDto } from './dto/user-stats.dto';
import {
  calculatePlayerMetrics,
  calculateTravellerProgression,
  findCompletedAchievementIds,
} from './achievements/progression';
import { ACHIEVEMENT_DEFINITIONS } from './achievements/achievements-definitions';
import { GalacticGuideResponseDto } from './dto/galactic-guide.dto';

type RankingAggregateRow = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  kills: number;
  points: number;
};

@Injectable()
export class ScoresService {
  constructor(private readonly prisma: PrismaService) {}

  async recordMatchResult(params: {
    gameType: string;
    finishedAt: Date;
    winnerId: string | null;
    isDraw: boolean;
    rankings: PlayerRanking[];
  }): Promise<void> {
    const participants = params.rankings.map((ranking, index) => ({
      userId: ranking.playerId,
      result: this.toStoredResult(
        ranking.playerId,
        params.winnerId,
        params.isDraw,
      ),
      kills: ranking.kills,
      score: null,
      rank: index + 1,
    }));

    if (participants.length === 0) return;

    await this.prisma.$transaction(async (tx) => {
      await tx.match.create({
        data: {
          gameType: params.gameType,
          finishedAt: params.finishedAt,
          participants: {
            create: participants,
          },
        },
      });

      const userIds = [...new Set(participants.map(({ userId }) => userId))];

      for (const userId of userIds) {
        await this.unlockCompletedAchievements(tx, userId);
      }
    });
  }

  async getMatchHistory(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<MatchHistoryResponseDto> {
    const offset = (page - 1) * limit;

    const [participants, total] = await this.prisma.$transaction([
      this.prisma.matchParticipant.findMany({
        where: { userId },
        skip: offset,
        take: limit,
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
      }),
      this.prisma.matchParticipant.count({
        where: { userId },
      }),
    ]);

    const data = participants.map((participant) => {
      const opponents = participant.match.participants
        .filter((item) => item.userId !== userId)
        .map((item) => item.user.username);

      return {
        id: participant.match.id,
        result: this.toHistoryResult(participant.result),
        opponents,
        playedAt: participant.match.finishedAt.toISOString(),
        gameType: participant.match.gameType,
        kills: participant.kills ?? undefined,
      };
    });

    return {
      data,
      hasMore: offset + limit < total,
      total,
      page,
    };
  }

  async getUserStats(userId: string): Promise<UserStatsDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const participants = await this.prisma.matchParticipant.findMany({
      where: { userId },
      select: {
        result: true,
        kills: true,
      },
      orderBy: [
        {
          match: {
            finishedAt: 'asc',
          },
        },
        {
          matchId: 'asc',
        },
      ],
    });

    let wins = 0;
    let losses = 0;
    let draws = 0;
    let kills = 0;
    let currentWinStreak = 0;
    let maxWinStreak = 0;

    for (const participant of participants) {
      kills += participant.kills ?? 0;

      switch (participant.result) {
        case MatchResult.WIN:
          wins += 1;
          currentWinStreak += 1;
          maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
          break;

        case MatchResult.LOSS:
          losses += 1;
          currentWinStreak = 0;
          break;

        case MatchResult.DRAW:
          draws += 1;
          currentWinStreak = 0;
          break;
      }
    }

    const totalGames = participants.length;
    const winRate =
      totalGames === 0 ? 0 : Number(((wins / totalGames) * 100).toFixed(1));

    return {
      totalGames,
      wins,
      losses,
      draws,
      kills,
      winRate,
      maxWinStreak,
    };
  }

  async getRankings(limit = 20): Promise<RankingsResponseDto> {
    const rankingLimit = Math.min(Math.max(limit, 1), 100);

    const rows = await this.prisma.$queryRaw<RankingAggregateRow[]>(
      Prisma.sql`
        SELECT
          mp."userId",
          u."username",
          u."avatarUrl",
          COUNT(*)::int AS "totalGames",
          COUNT(*) FILTER (WHERE mp."result" = 'WIN')::int AS "wins",
          COUNT(*) FILTER (WHERE mp."result" = 'LOSS')::int AS "losses",
          COUNT(*) FILTER (WHERE mp."result" = 'DRAW')::int AS "draws",
          COALESCE(SUM(mp."kills"), 0)::int AS "kills",
          (
            COUNT(*) FILTER (WHERE mp."result" = 'WIN') * 3
            + COUNT(*) FILTER (WHERE mp."result" = 'DRAW')
          )::int AS "points"
        FROM "MatchParticipant" mp
        INNER JOIN "User" u ON u."id" = mp."userId"
        GROUP BY mp."userId", u."username", u."avatarUrl"
        ORDER BY
          "points" DESC,
          "wins" DESC,
          "kills" DESC,
          "totalGames" DESC,
          u."username" ASC
        LIMIT ${rankingLimit}
      `,
    );

    const data = rows.map((row, index) => ({
      ...row,
      rank: index + 1,
      winRate:
        row.totalGames === 0
          ? 0
          : Number(((row.wins / row.totalGames) * 100).toFixed(1)),
    }));

    return { data };
  }

  async getGalacticGuide(userId: string): Promise<GalacticGuideResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [matches, unlockedRecords] = await this.prisma.$transaction([
      this.prisma.matchParticipant.findMany({
        where: { userId },
        select: {
          result: true,
          kills: true,
        },
        orderBy: [
          {
            match: {
              finishedAt: 'asc',
            },
          },
          {
            matchId: 'asc',
          },
        ],
      }),
      this.prisma.userAchievement.findMany({
        where: { userId },
        select: {
          achievementId: true,
          unlockedAt: true,
        },
      }),
    ]);
    const metrics = calculatePlayerMetrics(matches);
    const completedAchievementIds = new Set(
      findCompletedAchievementIds(metrics),
    );
    const progression = calculateTravellerProgression(matches);

    const unlockedById = new Map(
      unlockedRecords.map((record) => [
        record.achievementId,
        record.unlockedAt,
      ]),
    );
    const achievements = ACHIEVEMENT_DEFINITIONS.map((definition) => {
      const unlockedAt = unlockedById.get(definition.id);

      return {
        id: definition.id,
        name: definition.name,
        description: definition.description,
        icon: definition.icon,
        category: definition.category,
        progress: metrics[definition.metric],
        target: definition.target,
        unlocked: completedAchievementIds.has(definition.id),
        unlockedAt: unlockedAt?.toISOString() ?? null,
      };
    });

    return {
      progression,
      unlockedCount: achievements.filter((achievement) => achievement.unlocked)
        .length,
      totalCount: achievements.length,
      achievements,
    };
  }

  private async unlockCompletedAchievements(
    tx: Prisma.TransactionClient,
    userId: string,
  ): Promise<void> {
    const matches = await tx.matchParticipant.findMany({
      where: { userId },
      select: {
        result: true,
        kills: true,
      },
      orderBy: [
        {
          match: {
            finishedAt: 'asc',
          },
        },
        {
          matchId: 'asc',
        },
      ],
    });

    const metrics = calculatePlayerMetrics(matches);
    const completedAchievementIds = findCompletedAchievementIds(metrics);

    if (completedAchievementIds.length === 0) return;

    await tx.userAchievement.createMany({
      data: completedAchievementIds.map((achievementId) => ({
        userId,
        achievementId,
      })),
      skipDuplicates: true,
    });
  }

  private toStoredResult(
    playerId: string,
    winnerId: string | null,
    isDraw: boolean,
  ): MatchResult {
    if (isDraw || !winnerId) return MatchResult.DRAW;
    return playerId === winnerId ? MatchResult.WIN : MatchResult.LOSS;
  }

  private toHistoryResult(result: MatchResult): 'win' | 'loss' | 'draw' {
    switch (result) {
      case MatchResult.WIN:
        return 'win';
      case MatchResult.LOSS:
        return 'loss';
      case MatchResult.DRAW:
        return 'draw';
    }
  }
}

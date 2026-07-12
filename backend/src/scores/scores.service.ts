import { Injectable } from '@nestjs/common';
import { MatchHistoryResponseDto } from './dto/match-history.dto';
import { RankingsResponseDto } from './dto/ranking.dto';
import { PrismaService } from '../prisma.service';
import { MatchResult } from '../generated/prisma/enums';
import { Prisma } from '../generated/prisma/client.js';
import type { PlayerRanking } from '@ft_transcendence/shared/game-events.types';

type RankingAggregateRow = {
  userId: string;
  username: string;
  displayName: string | null;
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

    await this.prisma.match.create({
      data: {
        gameType: params.gameType,
        finishedAt: params.finishedAt,
        participants: {
          create: participants,
        },
      },
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
                      displayName: true,
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
        .map((item) => item.user.displayName ?? item.user.username);

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

  async getRankings(limit = 20): Promise<RankingsResponseDto> {
    const rankingLimit = Math.min(Math.max(limit, 1), 100);

    const rows = await this.prisma.$queryRaw<RankingAggregateRow[]>(
      Prisma.sql`
        SELECT
          mp."userId",
          u."username",
          u."displayName",
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
        GROUP BY mp."userId", u."username", u."displayName", u."avatarUrl"
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

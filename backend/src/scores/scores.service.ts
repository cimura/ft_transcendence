import { Injectable } from '@nestjs/common';
import { MatchHistoryResponseDto } from './dto/match-history.dto';
import { RankingsResponseDto } from './dto/ranking.dto';
import { PrismaService } from '../prisma.service';
import { MatchResult } from '../generated/prisma/enums';
import type { PlayerRanking } from '@ft_transcendence/shared/game-events.types';

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
    const participants = await this.prisma.matchParticipant.findMany({
      select: {
        userId: true,
        result: true,
        kills: true,
        user: {
          select: {
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    const rows = new Map<
      string,
      {
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
      }
    >();

    for (const participant of participants) {
      const row = rows.get(participant.userId) ?? {
        userId: participant.userId,
        username: participant.user.username,
        displayName: participant.user.displayName,
        avatarUrl: participant.user.avatarUrl,
        totalGames: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        kills: 0,
        points: 0,
      };

      row.totalGames += 1;
      row.kills += participant.kills ?? 0;

      if (participant.result === MatchResult.WIN) {
        row.wins += 1;
        row.points += 3;
      } else if (participant.result === MatchResult.DRAW) {
        row.draws += 1;
        row.points += 1;
      } else {
        row.losses += 1;
      }

      rows.set(participant.userId, row);
    }

    const data = [...rows.values()]
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.kills !== a.kills) return b.kills - a.kills;
        if (b.totalGames !== a.totalGames) return b.totalGames - a.totalGames;
        return a.username.localeCompare(b.username);
      })
      .slice(0, limit)
      .map((row, index) => ({
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

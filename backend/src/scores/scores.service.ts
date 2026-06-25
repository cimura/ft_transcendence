import { Injectable } from '@nestjs/common';
import { MatchHistoryResponseDto } from './dto/match-history.dto';
import { PrismaService } from 'src/prisma.service';
import { MatchResult } from 'src/generated/prisma/enums';

@Injectable()
export class ScoresService {
  constructor(private readonly prisma: PrismaService) {}
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
        orderBy: {
          match: {
            finishedAt: 'desc',
          },
        },
        include: {
          match: {
            include: {
              participants: {
                include: {
                  user: true,
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

import { Injectable } from '@nestjs/common';
import { MatchHistoryResponseDto } from './dto/match-history.dto';

@Injectable()
export class ScoresService {
  getMatchHistory(
    userId: string,
    page = 1,
    limit = 20,
  ): MatchHistoryResponseDto {
    const total = 3;

    const allMatches = [
      {
        id: `${userId}-match-1`,
        result: 'win' as const,
        opponents: ['alice', 'bob'],
        playedAt: new Date().toISOString(),
        gameType: 'Bomberman',
      },
      {
        id: `${userId}-match-2`,
        result: 'loss' as const,
        opponents: ['charlie'],
        playedAt: new Date(Date.now() - 3600000).toISOString(),
        gameType: 'Bomberman',
      },
      {
        id: `${userId}-match-3`,
        result: 'draw' as const,
        opponents: ['david'],
        playedAt: new Date(Date.now() - 7200000).toISOString(),
        gameType: 'Bomberman',
      },
    ];

    const offset = (page - 1) * limit;
    const data = allMatches.slice(offset, offset + limit);

    return {
      data,
      hasMore: offset + limit < total,
      total,
      page,
    };
  }
}

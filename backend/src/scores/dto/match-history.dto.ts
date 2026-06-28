import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MatchHistoryItemDto {
  @ApiProperty({ example: 'match-1' })
  id: string;

  @ApiProperty({ enum: ['win', 'loss', 'draw'], example: 'win' })
  result: 'win' | 'loss' | 'draw';

  @ApiProperty({ example: ['alice', 'bob'], type: [String] })
  opponents: string[];

  @ApiProperty({ example: '2026-06-22T10:30:00.000Z' })
  playedAt: string;

  @ApiProperty({ example: 'Bomberman' })
  gameType: string;

  @ApiPropertyOptional({ example: 2 })
  kills?: number;
}

export class MatchHistoryResponseDto {
  @ApiProperty({ type: [MatchHistoryItemDto] })
  data: MatchHistoryItemDto[];
  @ApiProperty({ example: true })
  hasMore: boolean;
  @ApiProperty({ example: 1 })
  total: number;
  @ApiProperty({ example: 1 })
  page: number;
}

export class MatchHistoryQueryDto {
  @ApiPropertyOptional({ example: 1 })
  page?: number;
  @ApiPropertyOptional({ example: 2 })
  limit?: number;
}

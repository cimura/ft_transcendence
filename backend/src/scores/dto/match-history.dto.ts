import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

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
  @ApiPropertyOptional({ example: 1, minimum: 1, maximum: 10000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  page?: number;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class RankingItemDto {
  @ApiProperty({ example: 'user-1' })
  userId: string;

  @ApiProperty({ example: 'alice' })
  username: string;

  @ApiProperty({ example: '/avatars/default-1.svg' })
  avatarUrl: string | null;

  @ApiProperty({ example: 1 })
  rank: number;

  @ApiProperty({ example: 42 })
  totalGames: number;

  @ApiProperty({ example: 28 })
  wins: number;

  @ApiProperty({ example: 10 })
  losses: number;

  @ApiProperty({ example: 4 })
  draws: number;

  @ApiProperty({ example: 84 })
  kills: number;

  @ApiProperty({ example: 88 })
  points: number;

  @ApiProperty({ example: 66.7 })
  winRate: number;
}

export class RankingsResponseDto {
  @ApiProperty({ type: [RankingItemDto] })
  data: RankingItemDto[];
}

export class RankingQueryDto {
  @ApiProperty({
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

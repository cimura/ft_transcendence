import { ApiProperty } from '@nestjs/swagger';

export class UserStatsDto {
  @ApiProperty({ example: 3 })
  totalGames: number;

  @ApiProperty({ example: 1 })
  wins: number;

  @ApiProperty({ example: 2 })
  losses: number;

  @ApiProperty({ example: 0 })
  draws: number;

  @ApiProperty({ example: 5 })
  kills: number;

  @ApiProperty({ example: 42.4 })
  winRate: number;

  @ApiProperty({ example: 1 })
  maxWinStreak: number;
}

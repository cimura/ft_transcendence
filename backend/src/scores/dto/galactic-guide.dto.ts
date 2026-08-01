import { ApiProperty } from '@nestjs/swagger';
import type { AchievementCategory } from '../achievements/achievements-definitions';

export class TravellerProgressionDto {
  @ApiProperty({ example: 2 })
  level: number;

  @ApiProperty({ example: 'Mostly Harmless Traveller' })
  title: string;

  @ApiProperty({ example: 105 })
  totalXp: number;

  @ApiProperty({ example: 55 })
  currentLevelXp: number;

  @ApiProperty({
    example: 70,
    nullable: true,
    description: 'XP required within the current level; null at maximum level',
  })
  levelXpRequired: number | null;

  @ApiProperty({
    example: 15,
    nullable: true,
    description: 'Remaining XP until the next level; null at maximum level',
  })
  xpToNextLevel: number | null;

  @ApiProperty({ example: 78.6 })
  progressPercent: number;
}

export class AchievementProgressDto {
  @ApiProperty({ example: 'first_match' })
  id: string;

  @ApiProperty({ example: 'Mostly Harmless' })
  name: string;

  @ApiProperty({ example: '初めての戦いを完了する' })
  description: string;

  @ApiProperty({ example: 'planet' })
  icon: string;

  @ApiProperty({
    example: 'JOURNEY',
    enum: ['JOURNEY', 'VICTORY', 'COMBAT'],
  })
  category: AchievementCategory;

  @ApiProperty({
    example: 3,
    description: 'Current value of the achievement metric',
  })
  progress: number;

  @ApiProperty({ example: 10 })
  target: number;

  @ApiProperty({ example: true })
  unlocked: boolean;

  @ApiProperty({
    example: '2026-08-01T10:00:00.000Z',
    nullable: true,
  })
  unlockedAt: string | null;
}

export class GalacticGuideResponseDto {
  @ApiProperty({ type: TravellerProgressionDto })
  progression: TravellerProgressionDto;

  @ApiProperty({ example: 3 })
  unlockedCount: number;

  @ApiProperty({ example: 6 })
  totalCount: number;

  @ApiProperty({ type: [AchievementProgressDto] })
  achievements: AchievementProgressDto[];
}

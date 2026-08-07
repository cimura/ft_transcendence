import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsUUID,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import type { Direction } from '@ft_transcendence/shared/game-events.types';

export class GameJoinDto {
  @IsUUID()
  @IsNotEmpty()
  roomId!: string;
}

export class PlayerInputDto {
  @ValidateIf((_, value) => value !== null)
  @IsIn(['up', 'down', 'left', 'right'])
  direction!: Direction | null;

  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  seq!: number;
}

export class BombPlaceDto {
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  seq!: number;
}

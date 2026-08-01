import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({ example: 'あつまれボンバーマン' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  name: string;

  @ApiPropertyOptional({ example: 'bomberman', default: 'bomberman' })
  @IsOptional()
  @IsString()
  @IsIn(['bomberman'])
  gameId?: string;

  @ApiProperty({ example: 4, enum: [2, 3, 4] })
  @IsInt()
  @Min(2)
  @Max(4)
  maxPlayers: 2 | 3 | 4;
}

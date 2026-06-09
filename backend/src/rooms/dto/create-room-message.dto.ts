import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateRoomMessageDto {
  @ApiProperty({ example: 'よろしくお願いします' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  content: string;
}

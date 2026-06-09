import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ReadyRoomDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isReady: boolean;
}

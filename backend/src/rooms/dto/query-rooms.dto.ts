import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export const ROOM_STATUS_QUERY_VALUES = [
  'waiting',
  'playing',
  'finished',
] as const;

export type QueryRoomStatus = (typeof ROOM_STATUS_QUERY_VALUES)[number];

export class QueryRoomsDto {
  @ApiPropertyOptional({
    example: 'waiting',
    enum: ROOM_STATUS_QUERY_VALUES,
  })
  @IsOptional()
  @IsString()
  @IsIn([...ROOM_STATUS_QUERY_VALUES])
  status?: QueryRoomStatus;
}

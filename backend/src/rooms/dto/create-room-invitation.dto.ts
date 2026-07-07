import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateRoomInvitationDto {
  @ApiProperty({ example: '6e65474b-ae4b-46c0-8cd9-7600c8a7edbb' })
  @IsUUID()
  inviteeId!: string;
}

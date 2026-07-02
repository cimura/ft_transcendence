import { ApiProperty } from '@nestjs/swagger';

export class NotificationActorDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  username!: string;

  @ApiProperty({ nullable: true })
  avatarUrl!: string | null;
}

export class NotificationRoomDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

export class NotificationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ['friend_request', 'game_invite'] })
  type!: 'friend_request' | 'game_invite';

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ type: NotificationActorDto })
  actor!: NotificationActorDto;

  @ApiProperty({ required: false })
  friendRequestId?: string;

  @ApiProperty({ required: false })
  invitationId?: string;

  @ApiProperty({ type: NotificationRoomDto, required: false })
  room?: NotificationRoomDto;
}

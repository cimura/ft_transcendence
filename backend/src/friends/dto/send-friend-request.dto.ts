import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendFriendRequestDto {
  @ApiProperty({
    example: '3f9b7b2a-...',
    description: 'フレンド申請を送る対象のユーザーのID',
  })
  @IsString()
  @IsNotEmpty()
  targetUserId!: string;
}

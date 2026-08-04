import { ApiProperty } from '@nestjs/swagger';
import { ProfileUserDto } from '../../users/dto/profile.dto';

export class SessionResponseDto {
  @ApiProperty({
    example: true,
    description: 'アクセストークンが有効かどうか',
  })
  valid: boolean;

  @ApiProperty({
    example: '2026-08-05T09:12:00.000Z',
    description: 'アクセストークンの有効期限 (validがtrueの時のみ)',
    required: false,
  })
  expiresAt?: string;

  @ApiProperty({
    description: 'ユーザー情報 (validがtrueの時のみ)',
    type: ProfileUserDto,
    required: false,
  })
  user?: ProfileUserDto;
}

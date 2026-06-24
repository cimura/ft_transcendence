import { ApiProperty } from '@nestjs/swagger';

export class UserSearchResponseDto {
  @ApiProperty({
    example: '3f9b7b2a-89ab-cdef-0123-456789abcdef',
    description: 'ユーザーID',
  })
  id: string;

  @ApiProperty({
    example: 'user_06',
    description: 'ユーザー名',
  })
  username: string;

  @ApiProperty({
    example: 'http://localhost:8443/uploads/avatars/default.png',
    description: 'プロフィール画像のURL',
    nullable: true,
  })
  avatarUrl: string | null;

  @ApiProperty({
    example: true,
    description: 'フレンドかどうかを表すフラグ',
  })
  isFriend: boolean;

  @ApiProperty({
    example: true,
    description: 'フレンド申請承認待ちかどうかを表すフラグ',
  })
  isPending: boolean;
}

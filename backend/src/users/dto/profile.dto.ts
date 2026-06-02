import { ApiProperty } from '@nestjs/swagger';

export class ProfileUserDto {
  @ApiProperty({
    example: '3f9b7b2a-...',
    description: 'ユーザーID',
  })
  id: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'メールアドレス',
  })
  email: string;

  @ApiProperty({
    example: 'Bob',
    description: '表示名 (被りOK)',
    nullable: true,
  })
  displayName: string | null;

  @ApiProperty({
    example: 'http://...',
    description: 'プロフィール画像のURL',
    nullable: true,
  })
  avatarUrl: string | null;
}

export class ProfileResponseDto {
  @ApiProperty({
    example: 'This is a protected route...',
    description: '認証されたことを示す通知文',
  })
  message: string;

  @ApiProperty({
    description: 'ユーザーの情報',
    type: ProfileUserDto,
  })
  user: ProfileUserDto;
}

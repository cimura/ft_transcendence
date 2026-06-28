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
    example: 'user_name',
    description: 'ユーザー名',
  })
  username: string;

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

  @ApiProperty({
    example: '2026-06-24T12:34:56.000Z',
    description: '作成日時',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2026-06-24T12:34:56.000Z',
    description: '更新日時',
  })
  updatedAt: Date;
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

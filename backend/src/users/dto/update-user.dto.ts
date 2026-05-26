import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({
    example: 'new-email@example.com',
    required: false,
    description: '変更後の新しいメールアドレス（変更しない場合は送信しない）',
  })
  email?: string;

  @ApiProperty({
    example: 'new-password123',
    required: false,
    description: '変更後の新しいパスワード（変更しない場合は送信しない）',
  })
  password?: string;
}

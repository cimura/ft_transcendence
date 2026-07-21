import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  Matches,
} from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({
    example: 'new-email@example.com',
    required: false,
    description: '変更後の新しいメールアドレス（変更しない場合は送信しない）',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: 'new_username',
    required: false,
    description: '変更後の新しいユーザー名（変更しない場合は送信しない）',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'ユーザー名には英数字、アンダースコア、ハイフンのみ使用できます',
  })
  username?: string;

  @ApiProperty({
    example: 'current-password123',
    required: false,
    description: '現在のパスワード（パスワード変更時のみ必須）',
  })
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @ApiProperty({
    example: 'new-password123',
    required: false,
    description: '変更後の新しいパスワード（変更しない場合は送信しない）',
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}

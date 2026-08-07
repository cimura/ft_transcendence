import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  Matches,
} from 'class-validator';
import { MaxUtf8ByteLength } from '../../common/validators/max-utf8-byte-length.validator';

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
  @MaxUtf8ByteLength(72, {
    message: '現在のパスワードは72 UTF-8バイト以内で入力してください',
  })
  currentPassword?: string;

  @ApiProperty({
    example: 'new-password123',
    required: false,
    description: '変更後の新しいパスワード（変更しない場合は送信しない）',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxUtf8ByteLength(72, {
    message: 'パスワードは72 UTF-8バイト以内で入力してください',
  })
  password?: string;
}

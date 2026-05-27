import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, MinLength, Min } from 'class-validator';

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
    example: 'new-password123',
    required: false,
    description: '変更後の新しいパスワード（変更しない場合は送信しない）',
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}

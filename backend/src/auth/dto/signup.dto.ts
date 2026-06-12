import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignUpRequestDto {
  @ApiProperty({
    example: 'example@example.com',
    description: 'ユーザーのメールアドレス (ユニーク)',
  })
  @IsEmail(
    {},
    { message: 'Please enter your email address in the correct format.' },
  )
  @IsNotEmpty({ message: 'Email is required.' })
  email: string;

  @ApiProperty({
    example: 'example42',
    description: 'ユーザーの名前（ユニーク）',
  })
  @IsNotEmpty({ message: 'Username is required.' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      'Username can only contain alphanumeric characters, underscores, and hyphens (no symbols like @).',
  })
  username: string;

  @ApiProperty({
    example: 'password123',
    description: 'サインイン用のパスワード (8文字以上)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  password: string;
}

export class SignUpResponseDto {
  @ApiProperty({
    example: '3f9b7b2a-...',
    description: 'ユーザーID',
  })
  id: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUz...',
    description: '今後APIにアクセスするために使う鍵',
  })
  accessToken: string;
}

export class SignUpConflictResponseDto {
  @ApiProperty({
    example: 409,
    description: 'HTTPステータスコード',
  })
  statusCode: number;

  @ApiProperty({
    example: 'Conflict',
    description: 'エラーの種類',
  })
  error: string;

  @ApiProperty({
    example: 'Email or Username already exists.',
    description: 'エラーメッセージの概要',
  })
  message: string;

  @ApiProperty({
    type: [String],
    example: ['username'],
    description: '重複しているフィールド名の配列。"email" or "username"',
  })
  fields: string[];
}

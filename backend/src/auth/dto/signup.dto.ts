import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
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
    example: 'user@example.com',
    description: 'メールアドレス',
  })
  email: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUz...',
    description: '今後APIにアクセスするために使う鍵',
  })
  accessToken: string;
}

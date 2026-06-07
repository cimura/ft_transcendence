import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignInRequestDto {
  @ApiProperty({
    example: 'example@example.com',
    description: 'ユーザーのメールアドレスまたはユーザーネーム (ユニーク)',
  })
  @IsNotEmpty({ message: 'email or password is required.' })
  identifier: string;

  @ApiProperty({
    example: 'password123',
    description: 'サインイン用のパスワード (8文字以上)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required.' })
  password: string;
}

export class SignInResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUz...',
    description: '今後APIにアクセスするために使う鍵',
  })
  accessToken: string;
}

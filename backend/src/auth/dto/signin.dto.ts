import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MaxUtf8ByteLength } from '../../common/validators/max-utf8-byte-length.validator';

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
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  @MaxUtf8ByteLength(72, {
    message: 'Password must be 72 UTF-8 bytes or fewer.',
  })
  password: string;
}

export class SignInResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUz...',
    description: '今後APIにアクセスするために使う鍵',
  })
  accessToken: string;
}

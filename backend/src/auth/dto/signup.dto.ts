import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum SignUpDuplicateField {
  EMAIL = 'email',
  USERNAME = 'username',
}

export class SignUpRequestDto {
  @ApiProperty({
    example: 'example@example.com',
    description: 'ユーザーのメールアドレス (ユニーク)',
  })
  @IsEmail({}, { message: 'Eメールアドレスを正しく入力してください' })
  @IsNotEmpty({ message: 'Eメールアドレスを入力してください' })
  @MaxLength(255, { message: 'Eメールアドレスは255文字以内で入力してください' })
  email: string;

  @ApiProperty({
    example: 'example42',
    description: 'ユーザーの名前（ユニーク）',
  })
  @IsNotEmpty({ message: 'ユーザー名を入力してください.' })
  @MinLength(3, { message: 'ユーザー名は3文字以上で入力してください' })
  @MaxLength(50, { message: 'ユーザー名は50文字以内で入力してください' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'ユーザー名には英数字、アンダースコア、ハイフンのみ使用できます',
  })
  username: string;

  @ApiProperty({
    example: 'password123',
    description: 'サインイン用のパスワード (8文字以上72文字以内)',
  })
  @IsString()
  @IsNotEmpty({ message: 'パスワードを入力してください' })
  @MinLength(8, { message: 'パスワードは最低8文字以上必要です' })
  @MaxLength(72, { message: 'パスワードは72文字以内で入力してください' })
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
    enum: SignUpDuplicateField,
    isArray: true,
    example: [SignUpDuplicateField.USERNAME],
    description: '重複しているフィールド名の配列。(email または username',
  })
  fields: SignUpDuplicateField[];
}

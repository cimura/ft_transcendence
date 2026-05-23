import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

// 1. SignUp（新規登録）
export class SignUpDto {
  @IsEmail({}, { message: 'Please enter your email address in the correct format.' })
  @IsNotEmpty({ message: 'Email is required.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Username is required.' })
  @MinLength(3, { message: 'Username must be at least 3 characters long.' })
	username: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  password: string;
}

// 2. SignIn（ログイン）
// （(今回はSignUpと同じだが、将来的に異なるルールを追加する可能性があるため定義)
export class SignInDto {
  @IsEmail({}, { message: 'Please enter your email address in the correct format.' })
  @IsNotEmpty({ message: 'Email is required.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Username or Email is required.' })
	identifier: string; // username or email

  @IsString()
  @IsNotEmpty({ message: 'Password is required.' })
  password: string;
}

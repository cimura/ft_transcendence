import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SignUpRequestDto {
  @IsEmail({}, { message: 'Please enter your email address in the correct format.' })
  @IsNotEmpty({ message: 'Email is required.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  password: string;
}

export class SignUpResponseDto {
  id: string;
  email: string;
}

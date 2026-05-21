import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SignInRequestDto {
  @IsEmail({}, { message: 'Please enter your email address in the correct format.' })
  @IsNotEmpty({ message: 'Email is required.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required.' })
  password: string;
}

export class SignInResponseDto {
  access_token: string;
}

import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import {
  SignUpRequestDto,
  SignUpResponseDto,
  SignUpConflictResponseDto,
} from './dto/signup.dto';
import { SignInRequestDto, SignInResponseDto } from './dto/signin.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  @ApiOperation({ summary: 'SignUp (新規登録)' })
  @ApiResponse({ status: 201, description: '成功時', type: SignUpResponseDto })
  @ApiConflictResponse({
    type: SignUpConflictResponseDto,
    description:
      'メールアドレス、またはユーザー名が既に存在する時。fieldsには"email"または"username"が入ります。',
  })
  signUp(@Body() dto: SignUpRequestDto) {
    return this.authService.signUp(dto);
  }

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'SignIn (ログイン)' })
  @ApiResponse({ status: 200, description: '成功時', type: SignInResponseDto })
  @ApiResponse({ status: 401, description: '認証失敗時' })
  signIn(@Body() dto: SignInRequestDto) {
    return this.authService.signIn(dto);
  }
}

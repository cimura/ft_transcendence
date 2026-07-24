import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
  ApiBearerAuth,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import {
  SignUpRequestDto,
  SignUpResponseDto,
  SignUpConflictResponseDto,
} from './dto/signup.dto';
import { SignInRequestDto, SignInResponseDto } from './dto/signin.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  @ApiOperation({ summary: 'SignUp (新規登録)' })
  @ApiCreatedResponse({ description: '成功時', type: SignUpResponseDto })
  @ApiConflictResponse({
    description: 'メールアドレス、またはユーザー名が既に存在する時',
    type: SignUpConflictResponseDto,
  })
  signUp(@Body() dto: SignUpRequestDto) {
    return this.authService.signUp(dto);
  }

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'SignIn (ログイン)' })
  @ApiOkResponse({ description: '成功時', type: SignInResponseDto })
  @ApiUnauthorizedResponse({ description: '認証失敗時' })
  signIn(@Body() dto: SignInRequestDto) {
    return this.authService.signIn(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout (ログアウト)' })
  @ApiNoContentResponse({ description: 'ログアウト成功時' })
  logout(): void {}
}

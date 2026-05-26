import {
  Body,
  Controller,
  UseGuards,
  Request,
  Post,
  Get,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SignUpRequestDto, SignUpResponseDto } from './dto/signup.dto';
import { SignInRequestDto, SignInResponseDto } from './dto/signin.dto';
import { ProfileResponseDto } from './dto/profile.dto';
import type { AuthenticatedRequest } from './interfaces/auth.interface';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  @ApiOperation({ summary: 'SignUp (新規登録)' })
  @ApiResponse({ status: 201, description: '成功時', type: SignUpResponseDto })
  @ApiResponse({ status: 409, description: 'メールアドレスが既に存在する時' })
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

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ユーザーのプロフィールの取得' })
  @ApiResponse({ status: 200, description: '成功時', type: ProfileResponseDto })
  @ApiResponse({ status: 401, description: '認証失敗時' })
  async profile(
    @Request() req: AuthenticatedRequest,
  ): Promise<ProfileResponseDto> {
    const user = await this.authService.profile(req.user.userId);
    return {
      message: 'This is a protected route. You are authenticated.',
      user,
    };
  }
}

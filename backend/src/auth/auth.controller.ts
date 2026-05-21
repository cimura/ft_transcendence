import { Body, Controller, UseGuards, Request, Post, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpRequestDto } from './dto/signup.dto';
import { SignInRequestDto } from './dto/signin.dto';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';

interface AuthenticatedRequest extends ExpressRequest {
  user: {
    userId: string;
    email: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  signUp(@Body() dto: SignUpRequestDto) {
    return this.authService.signUp(dto);
  }

  @Post('signin')
  signIn(@Body() dto: SignInRequestDto) {
    return this.authService.signIn(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req: AuthenticatedRequest) {
    return {
      message: 'This is a protected route. You are authenticated.',
      user: req.user,
    };
  }
}

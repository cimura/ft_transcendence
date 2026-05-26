import {
  Controller,
  Patch,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/auth.interface'; // 実際のパスに合わせて調整してください

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'ログイン中のユーザーのメールアドレスまたはパスワードを更新',
  })
  @ApiResponse({
    status: 200,
    description: '更新成功。最新のユーザー情報を返します',
  })
  @ApiResponse({ status: 400, description: '不正なリクエストデータです' })
  @ApiResponse({ status: 401, description: '認証情報が無効です（未ログイン）' })
  @ApiResponse({
    status: 409,
    description: '変更後のメールアドレスが既に他のユーザーに使用されています',
  })
  async updateMe(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateUserDto,
  ) {
    const userId = req.user.userId;

    return this.usersService.updateMe(userId, dto);
  }
}

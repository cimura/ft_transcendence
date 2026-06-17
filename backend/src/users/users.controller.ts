import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserSearchResponseDto } from './dto/users-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProfileResponseDto } from './dto/profile.dto';
import type { UserRequest } from './interfaces/user-request.interface';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ユーザーのプロフィールの取得' })
  @ApiOkResponse({
    description: '成功時',
    type: ProfileResponseDto,
  })
  @ApiUnauthorizedResponse({ description: '認証失敗時' })
  async profile(@Request() req: UserRequest): Promise<ProfileResponseDto> {
    const user = await this.usersService.profile(req.user.userId);
    return {
      message: 'This is a protected route. You are authenticated.',
      user,
    };
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ユーザー検索' })
  @ApiOkResponse({
    description: '成功時',
    type: UserSearchResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: '認証失敗時',
  })
  async search(
    @Request() req: UserRequest,
    @Query('q') query = '',
  ): Promise<UserSearchResponseDto[]> {
    return this.usersService.search(req.user.userId, query);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'ログイン中のユーザーのメールアドレスまたはパスワードを更新',
  })
  @ApiOkResponse({
    description: '更新成功。最新のユーザー情報を返します',
  })
  @ApiBadRequestResponse({
    description: '不正なリクエストデータです',
  })
  @ApiUnauthorizedResponse({
    description: '認証情報が無効です（未ログイン）',
  })
  @ApiConflictResponse({
    description: '変更後のメールアドレスが既に他のユーザーに使用されています',
  })
  async updateMe(@Request() req: UserRequest, @Body() dto: UpdateUserDto) {
    const userId = req.user.userId;

    return this.usersService.updateMe(userId, dto);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK) // 通常 DELETE では 204 だが、削除完了通知を返すため 200
  @ApiOperation({ summary: 'ログイン中の自分のアカウントを削除（退会処理）' })
  @ApiOkResponse({
    description: 'アカウントの削除が正常に完了しました',
  })
  @ApiUnauthorizedResponse({ description: '認証情報が無効です' })
  @ApiNotFoundResponse({
    description: '削除対象のユーザーが見つかりません',
  })
  async deleteMe(@Request() req: UserRequest) {
    return this.usersService.deleteMe(req.user.userId);
  }
}

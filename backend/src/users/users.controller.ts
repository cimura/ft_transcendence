import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  Param,
  HttpCode,
  HttpStatus,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { SelectDefaultAvatarDto } from './dto/select-default-avatar.dto';
import { UserSearchResponseDto } from './dto/users-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  AvatarUpdateResponseDto,
  ProfileResponseDto,
  PublicProfileResponseDto,
} from './dto/profile.dto';
import type { UserRequest } from './interfaces/user-request.interface';
import { MAX_IMAGE_SIZE_BYTES } from '../uploads/uploads.constants';

const AVATAR_UPLOAD_LIMITS = {
  fileSize: MAX_IMAGE_SIZE_BYTES,
  fields: 1,
  fieldNestingDepth: 1,
};

@Controller('users')
@ApiTags('users')
@ApiUnauthorizedResponse({ description: '認証失敗時' })
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'ユーザーのプロフィールの取得' })
  @ApiOkResponse({
    description: '成功時',
    type: ProfileResponseDto,
  })
  async profile(@Request() req: UserRequest): Promise<ProfileResponseDto> {
    const user = await this.usersService.profile(req.user.userId);
    return {
      message: 'This is a protected route. You are authenticated.',
      user,
    };
  }

  @Get('search')
  @ApiOperation({ summary: 'ユーザー検索' })
  @ApiOkResponse({
    description: '成功時',
    type: UserSearchResponseDto,
    isArray: true,
  })
  async search(
    @Request() req: UserRequest,
    @Query('q') query = '',
  ): Promise<UserSearchResponseDto[]> {
    return this.usersService.search(req.user.userId, query);
  }

  @Get(':userId/profile')
  @ApiOperation({ summary: '指定ユーザーのプロフィールの取得' })
  @ApiOkResponse({
    description: '成功時',
    type: PublicProfileResponseDto,
  })
  @ApiNotFoundResponse({
    description: '指定したユーザーが見つかりません',
  })
  async profileById(
    @Param('userId') userId: string,
  ): Promise<PublicProfileResponseDto> {
    const user = await this.usersService.profileById(userId);
    return {
      message: 'Profile retrieved successfully.',
      user,
    };
  }

  @Patch('me')
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

  @Patch('me/avatar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ログイン中のユーザーのデフォルトアバターを設定' })
  @ApiOkResponse({
    description: 'アバター画像更新成功。最新のユーザー情報を返します',
    type: AvatarUpdateResponseDto,
  })
  @ApiBadRequestResponse({
    description: '不正なアバターURLです',
  })
  @ApiNotFoundResponse({
    description: '更新対象のユーザーが見つかりません',
  })
  async selectDefaultAvatar(
    @Request() req: UserRequest,
    @Body() dto: SelectDefaultAvatarDto,
  ): Promise<AvatarUpdateResponseDto> {
    return this.usersService.selectDefaultAvatar(
      req.user.userId,
      dto.avatarUrl,
    );
  }

  @Post('me/avatar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: AVATAR_UPLOAD_LIMITS,
    }),
  )
  @ApiOperation({ summary: 'ログイン中のユーザーのアバター画像をアップロード' })
  @ApiOkResponse({
    description: 'アバター画像更新成功。最新のユーザー情報を返します',
    type: AvatarUpdateResponseDto,
  })
  @ApiBadRequestResponse({
    description: '画像ファイルが未指定、または許可されていない形式です',
  })
  @ApiNotFoundResponse({
    description: '更新対象のユーザーが見つかりません',
  })
  async uploadAvatar(
    @Request() req: UserRequest,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<AvatarUpdateResponseDto> {
    if (!file) {
      throw new BadRequestException('file is required');
    }

    return this.usersService.updateAvatar(req.user.userId, file);
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK) // 通常 DELETE では 204 だが、削除完了通知を返すため 200
  @ApiOperation({
    summary: 'ログイン中の自分のアカウントを削除（退会処理）',
    description:
      'アカウントと合わせて、フレンド関係・対戦参加記録・実績は確実に削除されます（DB上のCascade削除）。' +
      'アップロード済みのアバター画像はアカウント削除後にbest-effortで削除を試みますが、' +
      '失敗してもアカウント削除自体は成功として扱われます。その場合、削除できなかった画像はサーバーに残り、' +
      'サーバーログに記録されます（自動リトライは行われません）。',
  })
  @ApiOkResponse({
    description:
      'アカウントの削除が正常に完了しました（アバター画像の削除に失敗していてもこのレスポンスが返ります）',
  })
  @ApiNotFoundResponse({
    description: '削除対象のユーザーが見つかりません',
  })
  @ApiInternalServerErrorResponse({
    description: 'アカウントの削除に失敗しました',
  })
  async deleteMe(@Request() req: UserRequest) {
    return this.usersService.deleteMe(req.user.userId);
  }
}

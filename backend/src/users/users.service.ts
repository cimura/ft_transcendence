import {
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ProfileUserDto, PublicProfileUserDto } from './dto/profile.dto';
import { UserSearchResponseDto } from './dto/users-response.dto';
import { Prisma } from '../generated/prisma/client';
import * as bcrypt from 'bcrypt';
import { FriendRequestStatus } from '../generated/prisma/enums';
import { UploadsService } from '../uploads/uploads.service';
import { UPLOAD_URL_PREFIX } from '../uploads/uploads.constants';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadsService: UploadsService,
  ) {}

  async profile(userId: string): Promise<ProfileUserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    return user;
  }

  async profileById(userId: string): Promise<PublicProfileUserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    return user;
  }

  async search(
    userId: string,
    query: string,
  ): Promise<UserSearchResponseDto[]> {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: {
        id: { not: userId },
        username: { contains: normalizedQuery, mode: 'insensitive' },
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
      },
      take: 20,
      orderBy: { username: 'asc' },
    });

    const targetUserIds = users.map((user) => user.id);
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: userId, receiverId: { in: targetUserIds } },
          { receiverId: userId, requesterId: { in: targetUserIds } },
        ],
      },
      select: {
        requesterId: true,
        receiverId: true,
        status: true,
      },
    });

    return users.map((user) => {
      const friendship = friendships.find(
        (item) => item.requesterId === user.id || item.receiverId === user.id,
      );

      return {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        isFriend: friendship?.status === FriendRequestStatus.ACCEPTED,
        isPending: friendship?.status === FriendRequestStatus.PENDING,
      };
    });
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    if (!dto.email && !dto.username && !dto.password) {
      throw new BadRequestException({
        code: 'NO_UPDATE_FIELDS',
        message: 'No data provided for update',
      });
    }

    const updateData: Prisma.UserUpdateInput = {};

    if (dto.email) {
      // 新しい email がすでに存在するかをチェック
      const existingUser = await this.prisma.user.findFirst({
        where: {
          email: dto.email,
          NOT: { id: userId }, // 自分を見つけて重複だと判定させないため
        },
      });

      if (existingUser) {
        throw new ConflictException({
          code: 'EMAIL_ALREADY_IN_USE',
          message: 'Email is already in use by another user',
        });
      }

      updateData.email = dto.email;
    }

    if (dto.username) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          username: dto.username,
          NOT: { id: userId },
        },
      });

      if (existingUser) {
        throw new ConflictException({
          code: 'USERNAME_ALREADY_IN_USE',
          message: 'Username is already in use by another user',
        });
      }

      updateData.username = dto.username;
    }

    if (dto.password) {
      if (!dto.currentPassword) {
        throw new BadRequestException({
          code: 'CURRENT_PASSWORD_REQUIRED',
          message: 'Current password is required',
        });
      }

      const currentUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true },
      });

      if (!currentUser) {
        throw new NotFoundException({
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        });
      }

      const isCurrentPasswordValid = await bcrypt.compare(
        dto.currentPassword,
        currentUser.passwordHash,
      );

      if (!isCurrentPasswordValid) {
        throw new UnauthorizedException({
          code: 'CURRENT_PASSWORD_INVALID',
          message: 'Current password is invalid',
        });
      }

      // 安全のため、salt (ランダムな文字列) をパスワードに付与してからハッシュ化する
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(dto.password, saltRounds);
      updateData.passwordHash = hashedPassword;
    }

    try {
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          username: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return {
        message: 'User information updated successfully',
        user: updatedUser,
      };
    } catch (error: unknown) {
      if (!this.isRecordNotFoundError(error)) {
        throw error;
      }

      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }
  }

  async selectDefaultAvatar(userId: string, avatarUrl: string) {
    const previousAvatarUrl = await this.getCurrentAvatarUrl(userId);
    const updatedUser = await this.updateUserAvatar(userId, avatarUrl);
    await this.deletePreviousManagedAvatar(previousAvatarUrl, avatarUrl);

    return {
      message: 'Avatar updated successfully',
      avatarUrl,
      user: updatedUser,
    };
  }

  async updateAvatar(userId: string, file: Express.Multer.File) {
    const previousAvatarUrl = await this.getCurrentAvatarUrl(userId);
    const uploadedImage = await this.uploadsService.saveImage(file);

    try {
      const updatedUser = await this.updateUserAvatar(
        userId,
        uploadedImage.url,
      );

      await this.deletePreviousManagedAvatar(
        previousAvatarUrl,
        uploadedImage.url,
      );

      return {
        message: 'Avatar updated successfully',
        avatarUrl: uploadedImage.url,
        user: updatedUser,
      };
    } catch (error) {
      await this.uploadsService.deleteImage(uploadedImage);
      throw error;
    }
  }

  async deleteMe(userId: string) {
    // 実ファイルは DB のリレーションでは追跡できないため、削除された行の値を控えておく
    // (事前に findUnique で読むと、削除までの間にアバターが差し替わった場合に旧 URL を消してしまう)
    let deletedAvatarUrl: string | null = null;

    try {
      const deletedUser = await this.prisma.user.delete({
        where: { id: userId },
        select: { avatarUrl: true },
      });

      deletedAvatarUrl = deletedUser.avatarUrl;
    } catch (error: unknown) {
      if (this.isRecordNotFoundError(error)) {
        throw new NotFoundException({
          code: 'USER_NOT_FOUND',
          message: 'User not found or already deleted',
        });
      }

      if (this.isForeignKeyConstraintError(error)) {
        this.logger.error(
          `Failed to delete user ${userId} due to a foreign key constraint: ${JSON.stringify(error.meta)}`,
        );

        throw new InternalServerErrorException({
          code: 'ACCOUNT_DELETE_FAILED',
          message: 'Failed to delete your account. Please try again later.',
        });
      }

      throw error;
    }

    // User 行の削除（フレンド関係・対戦参加・実績は onDelete: Cascade で連鎖削除済み）が
    // 成功した後にのみ、DB のリレーションでは表現できないアバター資産を片付ける
    await this.deleteManagedAvatar(deletedAvatarUrl);

    return {
      message: 'Your account has been permanently deleted.',
    };
  }

  private async getCurrentAvatarUrl(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    return user.avatarUrl;
  }

  private async deletePreviousManagedAvatar(
    previousAvatarUrl: string | null,
    nextAvatarUrl: string,
  ) {
    if (!previousAvatarUrl || previousAvatarUrl === nextAvatarUrl) {
      return;
    }

    await this.deleteManagedAvatar(previousAvatarUrl);
  }

  private async deleteManagedAvatar(avatarUrl: string | null) {
    if (!avatarUrl || !avatarUrl.startsWith(`${UPLOAD_URL_PREFIX}/`)) {
      return;
    }

    try {
      const image = await this.uploadsService.findImageByUrl(avatarUrl);

      if (image) {
        await this.uploadsService.deleteImage(image);
      }
    } catch (error: unknown) {
      this.logger.warn(
        `Failed to delete avatar ${avatarUrl}: ${this.formatCleanupError(error)}`,
      );
    }
  }

  private async updateUserAvatar(userId: string, avatarUrl: string | null) {
    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: { avatarUrl },
        select: {
          id: true,
          email: true,
          username: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error: unknown) {
      if (!this.isRecordNotFoundError(error)) {
        throw error;
      }

      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }
  }

  private isRecordNotFoundError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    );
  }

  private isForeignKeyConstraintError(
    error: unknown,
  ): error is Prisma.PrismaClientKnownRequestError {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2003'
    );
  }

  private formatCleanupError(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}

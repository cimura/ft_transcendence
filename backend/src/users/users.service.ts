import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ProfileUserDto } from './dto/profile.dto';
import { UserSearchResponseDto } from './dto/users-response.dto';
import { Prisma } from '../generated/prisma/client';
import * as bcrypt from 'bcrypt';
import { FriendRequestStatus } from '../generated/prisma/enums';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async profile(userId: string): Promise<ProfileUserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
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
    if (!dto.email && !dto.password) {
      throw new BadRequestException('No data provided for update');
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
        throw new ConflictException('Email is already in use by another user');
      }

      updateData.email = dto.email;
    }

    if (dto.password) {
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
          displayName: true,
          avatarUrl: true,
        },
      });
      return {
        message: 'User information updated successfully',
        user: updatedUser,
      };
    } catch {
      throw new NotFoundException('User not found');
    }
  }

  async deleteMe(userId: string) {
    try {
      // TODO: schema.prisma の User に "onDelete: Cascade" を設定する
      // -> User と紐づいているデータ (チャット履歴やアバター画像など) が連鎖的に削除される
      await this.prisma.user.delete({
        where: { id: userId },
      });
      return {
        message: 'Your account has been permanently deleted.',
      };
    } catch {
      throw new NotFoundException('User not found or already deleted');
    }
  }
}

import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { Prisma } from '../generated/prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async updateMe(userId: string, dto: UpdateUserDto) {
    if (!dto.email && !dto.password) {
      throw new BadRequestException('No data provided for update');
    }

    const updateData: Prisma.UserUpdateInput = {};

    if (dto.email) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          email: dto.email,
          NOT: { id: userId },
        },
      });

      if (existingUser) {
        throw new ConflictException('Email is already in use by another user');
      }

      updateData.email = dto.email;
    }

    if (dto.password) {
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
}

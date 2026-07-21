import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RoomStatus } from '../generated/prisma/enums';
import { CreateRoomMessageDto } from './dto/create-room-message.dto';

const MAX_MESSAGES_PER_ROOM = 50;
const MESSAGE_COOLDOWN_MS = 1000;

@Injectable()
export class RoomsChatService {
  constructor(private readonly prisma: PrismaService) {}

  async findMessages(roomId: string, userId: string) {
    await this.assertParticipant(roomId, userId);

    const messages = await this.prisma.roomMessage.findMany({
      where: { roomId },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_MESSAGES_PER_ROOM,
    });

    return messages.reverse().map((message) => ({
      id: message.id,
      roomId: message.roomId,
      senderId: message.senderId,
      senderName: this.userName(message.sender),
      senderAvatarUrl: message.sender.avatarUrl,
      content: message.content,
      createdAt: message.createdAt,
    }));
  }

  async createMessage(
    roomId: string,
    userId: string,
    dto: CreateRoomMessageDto,
  ) {
    const room = await this.getRoomOrThrow(roomId);
    const participant = room.participants.find(
      (item) => item.userId === userId,
    );

    if (!participant) {
      throw new ForbiddenException('You are not a participant of this room');
    }

    if (room.status !== RoomStatus.WAITING) {
      throw new ConflictException('Messages can only be sent in waiting rooms');
    }

    const content = dto.content.trim();
    if (!content) {
      throw new BadRequestException('Message content is required');
    }

    if (content.length > 200) {
      throw new BadRequestException(
        'Message content must be 200 characters or less',
      );
    }

    const latestMessage = await this.prisma.roomMessage.findFirst({
      where: { roomId, senderId: userId },
      orderBy: { createdAt: 'desc' },
    });

    if (
      latestMessage &&
      Date.now() - latestMessage.createdAt.getTime() < MESSAGE_COOLDOWN_MS
    ) {
      throw new ConflictException('Please wait before sending another message');
    }

    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.roomMessage.create({
        data: {
          roomId,
          senderId: userId,
          content,
        },
        include: {
          sender: {
            select: {
              id: true,
              email: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      });

      const oldMessages = await tx.roomMessage.findMany({
        where: { roomId },
        orderBy: { createdAt: 'desc' },
        skip: MAX_MESSAGES_PER_ROOM,
        select: { id: true },
      });

      if (oldMessages.length > 0) {
        await tx.roomMessage.deleteMany({
          where: { id: { in: oldMessages.map((item) => item.id) } },
        });
      }

      return created;
    });

    return {
      id: message.id,
      roomId: message.roomId,
      senderId: message.senderId,
      senderName: this.userName(message.sender),
      senderAvatarUrl: message.sender.avatarUrl,
      content: message.content,
      createdAt: message.createdAt,
    };
  }

  private async assertParticipant(roomId: string, userId: string) {
    const room = await this.getRoomOrThrow(roomId);
    const participant = room.participants.find(
      (item) => item.userId === userId,
    );
    if (!participant) {
      throw new ForbiddenException('You are not a participant of this room');
    }
  }

  private async getRoomOrThrow(roomId: string) {
    const room = await this.prisma.gameRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: {
          select: { userId: true },
        },
      },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return room;
  }

  private userName(user: { email: string; displayName: string | null }) {
    return user.displayName ?? user.email;
  }
}

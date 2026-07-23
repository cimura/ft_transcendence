import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoomsStateService } from './rooms-state.service';
import { CreateRoomMessageDto } from './dto/create-room-message.dto';
import type { Room, RoomMessage } from '../common/types/room.type';

const MESSAGE_COOLDOWN_MS = 1000;

@Injectable()
export class RoomsChatService {
  constructor(private readonly roomsState: RoomsStateService) {}

  // eslint-disable-next-line @typescript-eslint/require-await -- gateway/controller await this method; keep async so switching back to persistence later doesn't ripple through callers
  async findMessages(roomId: string, userId: string): Promise<RoomMessage[]> {
    this.assertParticipant(roomId, userId);
    return this.roomsState.getRoomMessages(roomId);
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- see findMessages
  async createMessage(
    roomId: string,
    userId: string,
    dto: CreateRoomMessageDto,
  ): Promise<RoomMessage> {
    const room = this.getRoomOrThrow(roomId);
    const participant = room.participants[userId];

    if (!participant) {
      throw new ForbiddenException('You are not a participant of this room');
    }

    if (room.status !== 'WAITING') {
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

    const latestMessage = [...room.messages]
      .reverse()
      .find((message) => message.senderId === userId);

    if (
      latestMessage &&
      Date.now() - latestMessage.createdAt.getTime() < MESSAGE_COOLDOWN_MS
    ) {
      throw new ConflictException('Please wait before sending another message');
    }

    const message: RoomMessage = {
      id: randomUUID(),
      roomId,
      senderId: userId,
      senderName: participant.username,
      senderAvatarUrl: participant.avatarUrl,
      content,
      createdAt: new Date(),
    };

    this.roomsState.addRoomMessage(roomId, message);

    return message;
  }

  private assertParticipant(roomId: string, userId: string) {
    const room = this.getRoomOrThrow(roomId);
    if (!room.participants[userId]) {
      throw new ForbiddenException('You are not a participant of this room');
    }
  }

  private getRoomOrThrow(roomId: string): Room {
    const room = this.roomsState.getRoom(roomId);
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    return room;
  }
}

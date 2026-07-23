import { ConflictException } from '@nestjs/common';
import { RoomsChatService } from './rooms-chat.service';
import {
  RoomsStateService,
  MAX_MESSAGES_PER_ROOM,
} from './rooms-state.service';
import type { Room, RoomMessage } from '../common/types/room.type';

const user = {
  id: 'user-host',
  username: 'Host',
  avatarUrl: null,
};

describe('RoomsChatService', () => {
  let service: RoomsChatService;
  let roomsState: RoomsStateService;

  beforeEach(() => {
    roomsState = new RoomsStateService();
    service = new RoomsChatService(roomsState);
  });

  const setupRoom = (): Room => {
    const room: Room = {
      id: 'room-1',
      gameId: 'bomberman',
      name: 'Test Room',
      hostId: user.id,
      maxPlayers: 2,
      status: 'WAITING',
      mode: 'ONLINE',
      participants: {
        [user.id]: {
          userId: user.id,
          username: user.username,
          avatarUrl: user.avatarUrl,
          isHost: true,
          isReady: true,
          joinedAt: new Date(),
        },
      },
      messages: [],
      invitations: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    roomsState.addRoom(room);
    return room;
  };

  it('creates a message and stores it in the room state', async () => {
    const room = setupRoom();

    const result = await service.createMessage(room.id, user.id, {
      content: 'hello',
    });

    expect(result.content).toBe('hello');
    expect(result.senderName).toBe(user.username);
    expect(roomsState.getRoomMessages(room.id)).toEqual([result]);
  });

  it('prunes messages beyond the latest 50', async () => {
    const room = setupRoom();
    const old = new Date(Date.now() - 10_000);

    for (let i = 0; i < MAX_MESSAGES_PER_ROOM; i++) {
      const message: RoomMessage = {
        id: `seed-${i}`,
        roomId: room.id,
        senderId: 'other-user',
        senderName: 'Other',
        senderAvatarUrl: null,
        content: `seed ${i}`,
        createdAt: old,
      };
      roomsState.addRoomMessage(room.id, message);
    }

    const result = await service.createMessage(room.id, user.id, {
      content: 'newest',
    });

    const messages = roomsState.getRoomMessages(room.id);
    expect(messages).toHaveLength(MAX_MESSAGES_PER_ROOM);
    expect(messages[messages.length - 1]).toEqual(result);
    expect(messages.find((m) => m.id === 'seed-0')).toBeUndefined();
  });

  it('rejects chat messages sent within the one second cooldown', async () => {
    const room = setupRoom();
    roomsState.addRoomMessage(room.id, {
      id: 'previous',
      roomId: room.id,
      senderId: user.id,
      senderName: user.username,
      senderAvatarUrl: user.avatarUrl,
      content: 'first',
      createdAt: new Date(),
    });

    await expect(
      service.createMessage(room.id, user.id, { content: 'second' }),
    ).rejects.toThrow(ConflictException);
  });
});

import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RoomsChatService } from './rooms-chat.service';
import { RoomsStateService } from './rooms-state.service';
import type { Room } from '../common/types/room.type';

const user = {
  id: 'user-host',
  email: 'host@example.com',
  displayName: 'Host',
  avatarUrl: null,
};
const now = new Date();

describe('RoomsChatService', () => {
  let service: RoomsChatService;
  let roomsState: RoomsStateService;

  const prisma = {
    roomMessage: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    roomsState = new RoomsStateService();
    service = new RoomsChatService(
      prisma as unknown as PrismaService,
      roomsState,
    );
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
          username: 'Host',
          avatarUrl: null,
          isHost: true,
          isReady: true,
          joinedAt: new Date(),
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    roomsState.addRoom(room);
    return room;
  };

  it('prunes messages beyond the latest 50', async () => {
    const room = setupRoom();
    prisma.roomMessage.findFirst.mockResolvedValue(null);

    const tx = {
      roomMessage: {
        create: jest.fn().mockResolvedValue({
          id: 'message-new',
          roomId: room.id,
          senderId: user.id,
          content: '<b>hello</b>',
          createdAt: now,
          sender: user,
        }),
        findMany: jest.fn().mockResolvedValue([{ id: 'message-old' }]),
        deleteMany: jest.fn(),
      },
    };
    prisma.$transaction.mockImplementation(async (cb) => cb(tx));

    const result = await service.createMessage(room.id, user.id, {
      content: '<b>hello</b>',
    });

    expect(tx.roomMessage.create).toHaveBeenCalled();
    expect(tx.roomMessage.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['message-old'] } },
    });
    expect(result.content).toBe('<b>hello</b>');
  });

  it('rejects chat messages sent within the one second cooldown', async () => {
    setupRoom();
    prisma.roomMessage.findFirst.mockResolvedValue({ createdAt: new Date() }); // cooldown is active

    await expect(
      service.createMessage('room-1', user.id, { content: 'hello' }),
    ).rejects.toThrow(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

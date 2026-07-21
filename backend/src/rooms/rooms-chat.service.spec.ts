import { ConflictException } from '@nestjs/common';
import { RoomMode, RoomStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma.service';
import { bombermanGame } from '../games/games.constants';
import { RoomsChatService } from './rooms-chat.service';

const now = new Date('2026-06-09T00:00:00.000Z');

const user = {
  id: 'user-host',
  email: 'host@example.com',
  displayName: 'Host',
  avatarUrl: null,
};

const createRoom = (
  overrides: Partial<{
    id: string;
    maxPlayers: number;
    status: RoomStatus;
    mode: RoomMode;
    hostId: string;
    host: typeof user;
    participants: Array<{
      userId: string;
      isHost: boolean;
      isReady: boolean;
      joinedAt: Date;
      user: typeof user;
    }>;
  }> = {},
) => ({
  id: overrides.id ?? 'room-1',
  gameId: 'bomberman',
  name: 'Test Room',
  hostId: overrides.hostId ?? user.id,
  maxPlayers: overrides.maxPlayers ?? 2,
  status: overrides.status ?? RoomStatus.WAITING,
  mode: overrides.mode ?? RoomMode.ONLINE,
  settingsSnapshot: bombermanGame.settings,
  createdAt: now,
  updatedAt: now,
  startedAt: null,
  finishedAt: null,
  host: overrides.host ?? user,
  participants: overrides.participants ?? [
    {
      userId: user.id,
      isHost: true,
      isReady: true,
      joinedAt: now,
      user,
    },
  ],
});

describe('RoomsChatService', () => {
  let service: RoomsChatService;

  const prisma = {
    gameRoom: {
      findUnique: jest.fn(),
    },
    roomMessage: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RoomsChatService(prisma as unknown as PrismaService);
  });

  it('escapes chat content and prunes messages beyond the latest 50', async () => {
    const room = createRoom();
    prisma.gameRoom.findUnique.mockResolvedValue(room);
    prisma.roomMessage.findFirst.mockResolvedValue(null);

    const tx = {
      roomMessage: {
        create: jest.fn().mockResolvedValue({
          id: 'message-new',
          roomId: room.id,
          senderId: user.id,
          content: '&lt;b&gt;hello&lt;/b&gt;',
          createdAt: now,
          sender: user,
        }),
        findMany: jest.fn().mockResolvedValue([{ id: 'message-old' }]),
        deleteMany: jest.fn(),
      },
    };
    prisma.$transaction.mockImplementation(
      async (callback: (transaction: typeof tx) => Promise<unknown>) =>
        callback(tx),
    );

    const result = await service.createMessage(room.id, user.id, {
      content: '<b>hello</b>',
    });

    expect(tx.roomMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          content: '&lt;b&gt;hello&lt;/b&gt;',
        }),
      }),
    );
    expect(tx.roomMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 50,
      }),
    );
    expect(tx.roomMessage.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['message-old'] } },
    });
    expect(result.content).toBe('&lt;b&gt;hello&lt;/b&gt;');
  });

  it('rejects chat messages sent within the one second cooldown', async () => {
    prisma.gameRoom.findUnique.mockResolvedValue(createRoom());
    prisma.roomMessage.findFirst.mockResolvedValue({
      createdAt: new Date(), // cooldown is active
    });

    await expect(
      service.createMessage('room-1', user.id, { content: 'hello' }),
    ).rejects.toThrow(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

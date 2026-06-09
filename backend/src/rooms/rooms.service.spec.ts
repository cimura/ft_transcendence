import { ConflictException } from '@nestjs/common';
import { RoomStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma.service';
import { bombermanGame } from '../games/games.constants';
import { GamesService } from '../games/games.service';
import { RoomsService } from './rooms.service';

const now = new Date('2026-06-09T00:00:00.000Z');

const user = {
  id: 'user-host',
  email: 'host@example.com',
  displayName: 'Host',
  avatarUrl: null,
};

const guest = {
  id: 'user-guest',
  email: 'guest@example.com',
  displayName: null,
  avatarUrl: null,
};

const createRoom = (
  overrides: Partial<{
    id: string;
    maxPlayers: number;
    status: RoomStatus;
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
  hostId: user.id,
  maxPlayers: overrides.maxPlayers ?? 2,
  status: overrides.status ?? RoomStatus.WAITING,
  settingsSnapshot: bombermanGame.settings,
  createdAt: now,
  updatedAt: now,
  startedAt: null,
  finishedAt: null,
  host: user,
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

describe('RoomsService', () => {
  let service: RoomsService;

  const prisma = {
    gameRoom: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    roomParticipant: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    roomMessage: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const gamesService = {
    findById: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    gamesService.findById.mockReturnValue(bombermanGame);
    service = new RoomsService(
      prisma as unknown as PrismaService,
      gamesService as unknown as GamesService,
    );
  });

  it('creates a room with the host ready state stored on RoomParticipant', async () => {
    const room = createRoom();
    prisma.gameRoom.create.mockResolvedValue(room);

    const result = await service.create(user.id, {
      name: ' Test Room ',
      gameId: 'bomberman',
      maxPlayers: 2,
    });

    expect(prisma.gameRoom.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Test Room',
          hostId: user.id,
          settingsSnapshot: bombermanGame.settings,
          participants: {
            create: {
              userId: user.id,
              isHost: true,
              isReady: true,
            },
          },
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: room.id,
        status: 'waiting',
        players: [
          expect.objectContaining({
            userId: user.id,
            isHost: true,
            isReady: true,
          }),
        ],
      }),
    );
  });

  it('does not start until the room is full', async () => {
    prisma.gameRoom.findUnique.mockResolvedValue(createRoom({ maxPlayers: 2 }));

    await expect(service.start('room-1', user.id)).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.gameRoom.update).not.toHaveBeenCalled();
  });

  it('starts when the host requests it and all participants are ready', async () => {
    const waitingRoom = createRoom({
      maxPlayers: 2,
      participants: [
        {
          userId: user.id,
          isHost: true,
          isReady: true,
          joinedAt: now,
          user,
        },
        {
          userId: guest.id,
          isHost: false,
          isReady: true,
          joinedAt: now,
          user: guest,
        },
      ],
    });
    const playingRoom = { ...waitingRoom, status: RoomStatus.PLAYING };
    prisma.gameRoom.findUnique
      .mockResolvedValueOnce(waitingRoom)
      .mockResolvedValueOnce(playingRoom);
    prisma.gameRoom.update.mockResolvedValue(playingRoom);

    const result = await service.start('room-1', user.id);

    expect(prisma.gameRoom.update).toHaveBeenCalledWith({
      where: { id: 'room-1' },
      data: {
        status: RoomStatus.PLAYING,
        startedAt: expect.any(Date),
      },
    });
    expect(result.status).toBe('playing');
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
    prisma.$transaction.mockImplementation((callback) => callback(tx));

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
      createdAt: new Date(),
    });

    await expect(
      service.createMessage('room-1', user.id, { content: 'hello' }),
    ).rejects.toThrow(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

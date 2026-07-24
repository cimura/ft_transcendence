import { ConflictException } from '@nestjs/common';
import { RoomMode, RoomStatus } from '../generated/prisma/enums';
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
      updateMany: jest.fn(),
      delete: jest.fn(),
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
      undefined,
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
          mode: RoomMode.ONLINE,
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
        mode: 'online',
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

  it('filters rooms by status for the room list', async () => {
    const room = createRoom();
    prisma.gameRoom.findMany.mockResolvedValue([room]);

    const result = await service.findAll('waiting');

    expect(prisma.gameRoom.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: RoomStatus.WAITING },
      }),
    );
    expect(result).toEqual([
      expect.objectContaining({
        id: room.id,
        status: 'waiting',
      }),
    ]);
  });

  it('joins a waiting room through a locked transaction', async () => {
    const waitingRoom = createRoom({
      maxPlayers: 2,
    });
    const joinedRoom = createRoom({
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
          isReady: false,
          joinedAt: now,
          user: guest,
        },
      ],
    });
    const tx = {
      $queryRaw: jest.fn(),
      gameRoom: {
        findUnique: jest.fn().mockResolvedValue(waitingRoom),
      },
      roomParticipant: {
        create: jest.fn(),
      },
    };
    prisma.$transaction.mockImplementation(
      async (callback: (transaction: typeof tx) => Promise<unknown>) =>
        callback(tx),
    );
    prisma.gameRoom.findUnique.mockResolvedValue(joinedRoom);

    const result = await service.join('room-1', guest.id);

    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(tx.roomParticipant.create).toHaveBeenCalledWith({
      data: {
        roomId: 'room-1',
        userId: guest.id,
        isHost: false,
        isReady: false,
      },
    });
    expect(result.players).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: guest.id,
          isHost: false,
          isReady: false,
        }),
      ]),
    );
  });

  it('returns the current room when the user has already joined', async () => {
    const room = createRoom();
    const tx = {
      $queryRaw: jest.fn(),
      gameRoom: {
        findUnique: jest.fn().mockResolvedValue(room),
      },
      roomParticipant: {
        create: jest.fn(),
      },
    };
    prisma.$transaction.mockImplementation(
      async (callback: (transaction: typeof tx) => Promise<unknown>) =>
        callback(tx),
    );
    prisma.gameRoom.findUnique.mockResolvedValue(room);

    const result = await service.join('room-1', user.id);

    expect(tx.roomParticipant.create).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        id: room.id,
        players: [
          expect.objectContaining({
            userId: user.id,
            isHost: true,
          }),
        ],
      }),
    );
  });

  it('removes a participant on leave and returns the updated room', async () => {
    const room = createRoom({
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
          isReady: false,
          joinedAt: now,
          user: guest,
        },
      ],
    });
    const updatedRoom = createRoom();
    const tx = {
      $queryRaw: jest.fn(),
      gameRoom: {
        findUnique: jest.fn().mockResolvedValue(room),
        delete: jest.fn(),
        update: jest.fn(),
      },
      roomParticipant: {
        delete: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    prisma.$transaction.mockImplementation(
      async (callback: (transaction: typeof tx) => Promise<unknown>) =>
        callback(tx),
    );
    prisma.gameRoom.findUnique.mockResolvedValue(updatedRoom);

    const result = await service.leave('room-1', guest.id);

    expect(tx.roomParticipant.delete).toHaveBeenCalledWith({
      where: { roomId_userId: { roomId: 'room-1', userId: guest.id } },
    });
    expect(result.players).toEqual([
      expect.objectContaining({
        userId: user.id,
        isHost: true,
      }),
    ]);
  });

  it('deletes the room when the host leaves', async () => {
    const room = createRoom();
    const tx = {
      $queryRaw: jest.fn(),
      gameRoom: {
        findUnique: jest.fn().mockResolvedValue(room),
        delete: jest.fn(),
        update: jest.fn(),
      },
      roomParticipant: {
        delete: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    prisma.$transaction.mockImplementation(
      async (callback: (transaction: typeof tx) => Promise<unknown>) =>
        callback(tx),
    );

    const result = await service.leave('room-1', user.id);

    expect(tx.gameRoom.delete).toHaveBeenCalledWith({
      where: { id: 'room-1' },
    });
    expect(result).toEqual({ deleted: true, roomId: 'room-1' });
  });

  it('transfers host ownership when the host leaves and participants remain', async () => {
    const room = createRoom({
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
          isReady: false,
          joinedAt: new Date(now.getTime() + 1000),
          user: guest,
        },
      ],
    });
    const updatedRoom = createRoom({
      hostId: guest.id,
      host: guest,
      participants: [
        {
          userId: guest.id,
          isHost: true,
          isReady: true,
          joinedAt: new Date(now.getTime() + 1000),
          user: guest,
        },
      ],
    });
    const tx = {
      $queryRaw: jest.fn(),
      gameRoom: {
        findUnique: jest.fn().mockResolvedValue(room),
        delete: jest.fn(),
        update: jest.fn(),
      },
      roomParticipant: {
        delete: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    prisma.$transaction.mockImplementation(
      async (callback: (transaction: typeof tx) => Promise<unknown>) =>
        callback(tx),
    );
    prisma.gameRoom.findUnique.mockResolvedValue(updatedRoom);

    const result = await service.leave('room-1', user.id);

    expect(tx.roomParticipant.delete).toHaveBeenCalledWith({
      where: { roomId_userId: { roomId: 'room-1', userId: user.id } },
    });
    expect(tx.roomParticipant.update).toHaveBeenCalledWith({
      where: { roomId_userId: { roomId: 'room-1', userId: guest.id } },
      data: { isHost: true, isReady: true },
    });
    expect(tx.gameRoom.update).toHaveBeenCalledWith({
      where: { id: 'room-1' },
      data: { hostId: guest.id },
    });
    expect(result).toEqual(
      expect.objectContaining({
        hostId: guest.id,
        players: [
          expect.objectContaining({
            userId: guest.id,
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

  it('creates a local CPU room when requested', async () => {
    const room = createRoom({ mode: RoomMode.LOCAL_CPU, maxPlayers: 4 });
    prisma.gameRoom.create.mockResolvedValue(room);

    const result = await service.create(user.id, {
      name: 'CPU Practice',
      gameId: 'bomberman',
      maxPlayers: 4,
      mode: 'local_cpu',
    });

    expect(prisma.gameRoom.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          mode: RoomMode.LOCAL_CPU,
        }),
      }),
    );
    expect(result.mode).toBe('local_cpu');
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

  it('starts a local CPU room with only the host participant', async () => {
    const waitingRoom = createRoom({
      mode: RoomMode.LOCAL_CPU,
      maxPlayers: 4,
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
    expect(result.mode).toBe('local_cpu');
  });

  it('does not start a local CPU room after another human has joined', async () => {
    prisma.gameRoom.findUnique.mockResolvedValue(
      createRoom({
        mode: RoomMode.LOCAL_CPU,
        maxPlayers: 4,
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
      }),
    );

    await expect(service.start('room-1', user.id)).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.gameRoom.update).not.toHaveBeenCalled();
  });
});

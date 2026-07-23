import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { bombermanGame } from '../games/games.constants';
import { GamesService } from '../games/games.service';
import { RoomsService } from './rooms.service';
import { RoomsStateService } from './rooms-state.service';
import type { Room } from '../common/types/room.type';

const user = {
  id: 'user-host',
  email: 'host@example.com',
  displayName: 'Host',
  avatarUrl: null,
};

const guest = {
  id: 'user-guest',
  email: 'guest@example.com',
  displayName: 'Guest',
  avatarUrl: null,
};

describe('RoomsService', () => {
  let service: RoomsService;
  let roomsState: RoomsStateService;

  const prisma = {
    user: { findUnique: jest.fn() },
  };

  const gamesService = {
    findById: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    gamesService.findById.mockReturnValue(bombermanGame);
    roomsState = new RoomsStateService();
    service = new RoomsService(
      prisma as unknown as PrismaService,
      gamesService as unknown as GamesService,
      roomsState,
    );
  });

  const setupRoom = (overrides: Partial<Room> = {}): Room => {
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
      messages: [],
      invitations: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
    roomsState.addRoom(room);
    return room;
  };

  it('creates a room and adds it to the memory state', async () => {
    prisma.user.findUnique.mockResolvedValue(user);

    const result = await service.create(user.id, {
      name: 'Test Room',
      gameId: 'bomberman',
      maxPlayers: 2,
      mode: 'online',
    });

    expect(result.name).toBe('Test Room');
    expect(result.hostId).toBe(user.id);
    expect(roomsState.getAllRooms().length).toBe(1);
    expect(roomsState.getAllRooms()[0].participants[user.id].isHost).toBe(true);
  });

  it('filters rooms by status for the room list', () => {
    setupRoom({ status: 'WAITING' });
    setupRoom({ id: 'room-2', status: 'PLAYING' });

    const result = service.findAll('waiting');
    expect(result.length).toBe(1);
    expect(result[0].status).toBe('waiting');
  });

  it('joins a waiting room and updates memory state', async () => {
    setupRoom();
    prisma.user.findUnique.mockResolvedValue(guest);

    const result = await service.join('room-1', guest.id);

    expect(result.players.length).toBe(2);
    expect(roomsState.getRoom('room-1')?.participants[guest.id]).toBeDefined();
  });

  it('returns the current room when the user has already joined', async () => {
    setupRoom();

    const result = await service.join('room-1', user.id);

    expect(result.players.length).toBe(1);
  });

  it('removes a participant on leave and transfers host ownership', () => {
    setupRoom({
      participants: {
        [user.id]: {
          userId: user.id,
          username: 'Host',
          avatarUrl: null,
          isHost: true,
          isReady: true,
          joinedAt: new Date(Date.now() - 1000),
        },
        [guest.id]: {
          userId: guest.id,
          username: 'Guest',
          avatarUrl: null,
          isHost: false,
          isReady: false,
          joinedAt: new Date(),
        },
      },
    });

    const result = service.leave('room-1', user.id);

    expect(result).toEqual(
      expect.objectContaining({
        id: 'room-1',
        hostId: guest.id,
        hostName: 'Guest',
        players: [
          expect.objectContaining({
            userId: guest.id,
            isHost: true,
            isReady: true,
          }),
        ],
      }),
    );
    const memoryRoom = roomsState.getRoom('room-1')!;
    expect(memoryRoom.participants[user.id]).toBeUndefined();
    expect(memoryRoom.participants[guest.id].isHost).toBe(true);
  });

  it('deletes the room from memory when the last participant leaves', () => {
    setupRoom();

    const result = service.leave('room-1', user.id);

    expect(result).toEqual({ deleted: true, roomId: 'room-1' });
    expect(roomsState.getRoom('room-1')).toBeUndefined();
  });

  it('does not start until the room is full', () => {
    setupRoom({ maxPlayers: 2 });

    expect(() => service.start('room-1', user.id)).toThrow(ConflictException);
  });

  it('creates a local CPU room when requested', async () => {
    prisma.user.findUnique.mockResolvedValue(user);

    const result = await service.create(user.id, {
      name: 'CPU Practice',
      gameId: 'bomberman',
      maxPlayers: 4,
      mode: 'local_cpu',
    });

    expect(result.mode).toBe('local_cpu');
    expect(roomsState.getAllRooms()[0].mode).toBe('LOCAL_CPU');
  });

  it('starts when the host requests it and all participants are ready', () => {
    setupRoom({
      maxPlayers: 2,
      participants: {
        [user.id]: {
          userId: user.id,
          username: 'Host',
          avatarUrl: null,
          isHost: true,
          isReady: true,
          joinedAt: new Date(),
        },
        [guest.id]: {
          userId: guest.id,
          username: 'Guest',
          avatarUrl: null,
          isHost: false,
          isReady: true,
          joinedAt: new Date(),
        },
      },
    });

    const result = service.start('room-1', user.id);

    expect(result.status).toBe('playing');
    expect(roomsState.getRoom('room-1')?.status).toBe('PLAYING');
  });

  it('starts a local CPU room with only the host participant', () => {
    setupRoom({ mode: 'LOCAL_CPU', maxPlayers: 4 });

    const result = service.start('room-1', user.id);

    expect(result.status).toBe('playing');
    expect(result.mode).toBe('local_cpu');
  });

  it('does not start a local CPU room after another human has joined', () => {
    setupRoom({
      mode: 'LOCAL_CPU',
      maxPlayers: 4,
      participants: {
        [user.id]: {
          userId: user.id,
          username: 'Host',
          avatarUrl: null,
          isHost: true,
          isReady: true,
          joinedAt: new Date(),
        },
        [guest.id]: {
          userId: guest.id,
          username: 'Guest',
          avatarUrl: null,
          isHost: false,
          isReady: true,
          joinedAt: new Date(),
        },
      },
    });

    expect(() => service.start('room-1', user.id)).toThrow(ConflictException);
  });
});

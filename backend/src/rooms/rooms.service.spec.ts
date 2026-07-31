import { ConflictException, NotFoundException } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma.service';
import { bombermanGame } from '../games/games.constants';
import { GamesService } from '../games/games.service';
import { RoomsService } from './rooms.service';
import { RoomsStateService } from './rooms-state.service';
import type { Room } from '../common/types/room.type';
import {
  ROOM_CREATED_EVENT,
  ROOM_UPDATED_EVENT,
  ROOM_DELETED_EVENT,
  RoomCreatedEvent,
  RoomUpdatedEvent,
  RoomDeletedEvent,
} from './events/room-domain-events';

const user = {
  id: 'user-host',
  email: 'host@example.com',
  username: 'Host',
  avatarUrl: null,
};

const guest = {
  id: 'user-guest',
  email: 'guest@example.com',
  username: 'Guest',
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

  const eventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    gamesService.findById.mockReturnValue(bombermanGame);
    roomsState = new RoomsStateService();
    service = new RoomsService(
      prisma as unknown as PrismaService,
      gamesService as unknown as GamesService,
      roomsState,
      eventEmitter as unknown as EventEmitter2,
    );
  });

  const setupRoom = (overrides: Partial<Room> = {}): Room => {
    const room: Room = {
      id: 'room-1',
      gameId: 'bomberman',
      name: 'Test Room',
      hostId: user.id,
      maxPlayers: 2,
      status: 'waiting',
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
    });

    expect(result.name).toBe('Test Room');
    expect(result.hostId).toBe(user.id);
    expect(roomsState.getAllRooms().length).toBe(1);
    expect(roomsState.getAllRooms()[0].participants[user.id].isHost).toBe(true);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      ROOM_CREATED_EVENT,
      expect.any(RoomCreatedEvent),
    );
  });

  it('filters rooms by status for the room list', () => {
    setupRoom({ status: 'waiting' });
    setupRoom({ id: 'room-2', status: 'playing' });

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

  it('throws NotFoundException if the room is deleted while the user lookup is in flight', async () => {
    setupRoom();
    prisma.user.findUnique.mockImplementation(() => {
      // ユーザー取得のawait中に部屋が削除されたケースを再現
      roomsState.deleteRoom('room-1');
      return Promise.resolve(guest);
    });

    await expect(service.join('room-1', guest.id)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws ConflictException if the room stops waiting while the user lookup is in flight', async () => {
    setupRoom();
    prisma.user.findUnique.mockImplementation(() => {
      // ユーザー取得のawait中に対戦開始等で状態が変わったケースを再現
      roomsState.updateRoomStatus('room-1', 'playing');
      return Promise.resolve(guest);
    });

    await expect(service.join('room-1', guest.id)).rejects.toThrow(
      ConflictException,
    );
  });

  it('throws ConflictException if the room fills up while the user lookup is in flight', async () => {
    setupRoom({ maxPlayers: 2 });
    prisma.user.findUnique.mockImplementation(() => {
      // ユーザー取得のawait中に別の参加者が定員を埋めたケースを再現
      roomsState.addParticipant('room-1', {
        userId: 'other-user',
        username: 'Other',
        avatarUrl: null,
        isHost: false,
        isReady: false,
        joinedAt: new Date(),
      });
      return Promise.resolve(guest);
    });

    const promise = service.join('room-1', guest.id);
    await expect(promise).rejects.toThrow(ConflictException);
    await expect(promise).rejects.toThrow('Room is full');
  });

  it('returns the current room without duplicating if the user already joined while the lookup was in flight', async () => {
    setupRoom();
    prisma.user.findUnique.mockImplementation(() => {
      // ユーザー取得のawait中に同一ユーザーの多重ログイン等で先に参加済みになったケースを再現
      roomsState.addParticipant('room-1', {
        userId: guest.id,
        username: 'Guest',
        avatarUrl: null,
        isHost: false,
        isReady: false,
        joinedAt: new Date(),
      });
      return Promise.resolve(guest);
    });

    const result = await service.join('room-1', guest.id);

    expect(result.players.length).toBe(2);
    expect(roomsState.getRoom('room-1')?.participants[guest.id]).toBeDefined();
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
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      ROOM_UPDATED_EVENT,
      expect.any(RoomUpdatedEvent),
    );
  });

  it('deletes the room from memory when the last participant leaves', () => {
    setupRoom();

    const result = service.leave('room-1', user.id);

    expect(result).toBeNull();
    expect(roomsState.getRoom('room-1')).toBeUndefined();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      ROOM_DELETED_EVENT,
      expect.any(RoomDeletedEvent),
    );
  });

  it('deletes the room after the transferred host is the last to leave', () => {
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

    const roomAfterHostLeaves = service.leave('room-1', user.id);

    expect(roomAfterHostLeaves).toEqual(
      expect.objectContaining({
        hostId: guest.id,
        players: [
          expect.objectContaining({
            userId: guest.id,
            isHost: true,
          }),
        ],
      }),
    );

    const result = service.leave('room-1', guest.id);

    expect(result).toBeNull();
    expect(roomsState.getRoom('room-1')).toBeUndefined();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      ROOM_DELETED_EVENT,
      expect.any(RoomDeletedEvent),
    );
  });

  it('does not start until the room is full', () => {
    setupRoom({ maxPlayers: 2 });

    expect(() => service.start('room-1', user.id)).toThrow(ConflictException);
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
    expect(roomsState.getRoom('room-1')?.status).toBe('playing');
  });
});

import { ConflictException, ForbiddenException } from '@nestjs/common';
import {
  FriendRequestStatus,
  RoomInvitationStatus,
  RoomMode,
  RoomStatus,
} from '../generated/prisma/enums';
import { PrismaService } from '../prisma.service';
import { bombermanGame } from '../games/games.constants';
import { RoomsService } from './rooms.service';
import { RoomsInvitationService } from './rooms-invitation.service';

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

const createInvitation = () => ({
  id: 'invitation-1',
  roomId: 'room-1',
  inviterId: user.id,
  inviteeId: guest.id,
  status: RoomInvitationStatus.PENDING,
  createdAt: now,
  updatedAt: now,
  inviter: user,
  invitee: guest,
  room: {
    id: 'room-1',
    name: 'Test Room',
  },
});

describe('RoomsInvitationService', () => {
  let service: RoomsInvitationService;
  let roomsService: jest.Mocked<RoomsService>;

  const prisma = {
    gameRoom: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    friendship: {
      findFirst: jest.fn(),
    },
    roomInvitation: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    roomsService = {
      joinRoomWithinTransaction: jest.fn(),
      findOne: jest.fn(),
    } as any;

    service = new RoomsInvitationService(
      prisma as unknown as PrismaService,
      roomsService,
    );
  });

  it('creates a pending room invitation for a friend', async () => {
    const room = createRoom();
    const invitation = createInvitation();
    prisma.gameRoom.findUnique.mockResolvedValue(room);
    prisma.user.findUnique.mockResolvedValue({ id: guest.id });
    prisma.friendship.findFirst.mockResolvedValue({ id: 'friendship-1' });
    prisma.roomInvitation.findFirst.mockResolvedValue(null);
    prisma.roomInvitation.create.mockResolvedValue(invitation);

    const result = await service.createInvitation(room.id, user.id, {
      inviteeId: guest.id,
    });

    expect(prisma.friendship.findFirst).toHaveBeenCalledWith({
      where: {
        status: FriendRequestStatus.ACCEPTED,
        OR: [
          { requesterId: user.id, receiverId: guest.id },
          { requesterId: guest.id, receiverId: user.id },
        ],
      },
      select: { id: true },
    });
    expect(prisma.roomInvitation.create).toHaveBeenCalledWith({
      data: {
        roomId: room.id,
        inviterId: user.id,
        inviteeId: guest.id,
      },
      include: expect.any(Object),
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: invitation.id,
        status: 'pending',
        room: {
          id: room.id,
          name: room.name,
        },
      }),
    );
  });

  it('rejects room invitations to users who are not friends', async () => {
    const room = createRoom();
    prisma.gameRoom.findUnique.mockResolvedValue(room);
    prisma.user.findUnique.mockResolvedValue({ id: guest.id });
    prisma.friendship.findFirst.mockResolvedValue(null);

    await expect(
      service.createInvitation(room.id, user.id, { inviteeId: guest.id }),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.roomInvitation.create).not.toHaveBeenCalled();
  });

  it('accepts a pending invitation with guarded status update and delegates room join', async () => {
    const invitation = {
      id: 'invitation-1',
      roomId: 'room-1',
      inviterId: user.id,
      inviteeId: guest.id,
      status: RoomInvitationStatus.PENDING,
    };

    const expectedJoinedRoom = { id: 'room-1', name: 'Test Room' };

    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'friendship-1' }]),
      roomInvitation: {
        findUnique: jest.fn().mockResolvedValue(invitation),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    prisma.$transaction.mockImplementation(
      async (callback: (transaction: typeof tx) => Promise<unknown>) =>
        callback(tx),
    );

    roomsService.joinRoomWithinTransaction.mockResolvedValue('room-1');
    roomsService.findOne.mockResolvedValue(expectedJoinedRoom as any);

    const result = await service.acceptInvitation('invitation-1', guest.id);

    expect(tx.roomInvitation.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'invitation-1',
        inviteeId: guest.id,
        status: RoomInvitationStatus.PENDING,
      },
      data: { status: RoomInvitationStatus.ACCEPTED },
    });
    expect(roomsService.joinRoomWithinTransaction).toHaveBeenCalledWith(
      tx,
      'room-1',
      guest.id,
    );
    expect(roomsService.findOne).toHaveBeenCalledWith('room-1');
    expect(result).toEqual(expectedJoinedRoom);
  });

  it('rejects an invitation accept when the guarded status update loses the race', async () => {
    const invitation = {
      id: 'invitation-1',
      roomId: 'room-1',
      inviterId: user.id,
      inviteeId: guest.id,
      status: RoomInvitationStatus.PENDING,
    };
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'friendship-1' }]),
      roomInvitation: {
        findUnique: jest.fn().mockResolvedValue(invitation),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    prisma.$transaction.mockImplementation(
      async (callback: (transaction: typeof tx) => Promise<unknown>) =>
        callback(tx),
    );

    await expect(
      service.acceptInvitation('invitation-1', guest.id),
    ).rejects.toThrow(ConflictException);
  });

  it('declines a pending invitation with a guarded status update', async () => {
    prisma.roomInvitation.findUnique.mockResolvedValue({
      inviteeId: guest.id,
      status: RoomInvitationStatus.PENDING,
    });
    prisma.roomInvitation.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.declineInvitation('invitation-1', guest.id);

    expect(prisma.roomInvitation.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'invitation-1',
        inviteeId: guest.id,
        status: RoomInvitationStatus.PENDING,
      },
      data: { status: RoomInvitationStatus.DECLINED },
    });
    expect(result).toEqual({ message: 'Room invitation declined.' });
  });

  it('rejects an invitation decline when the guarded status update loses the race', async () => {
    prisma.roomInvitation.findUnique.mockResolvedValue({
      inviteeId: guest.id,
      status: RoomInvitationStatus.PENDING,
    });
    prisma.roomInvitation.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.declineInvitation('invitation-1', guest.id),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects a pending invitation after the friendship was deleted', async () => {
    const invitation = {
      id: 'invitation-1',
      roomId: 'room-1',
      inviterId: user.id,
      inviteeId: guest.id,
      status: RoomInvitationStatus.PENDING,
    };
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]), // フレンドシップが見つからないモック
      roomInvitation: {
        findUnique: jest.fn().mockResolvedValue(invitation),
        updateMany: jest.fn(),
      },
    };
    prisma.$transaction.mockImplementation(
      async (callback: (transaction: typeof tx) => Promise<unknown>) =>
        callback(tx),
    );

    try {
      await service.acceptInvitation(invitation.id, guest.id);
      fail('Expected invitation acceptance to be rejected');
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toEqual({
        code: 'ROOM_INVITATION_NO_LONGER_ALLOWED',
        message:
          'Cannot join this invitation because the friendship has been terminated.',
      });
    }

    expect(tx.roomInvitation.updateMany).not.toHaveBeenCalled();
    expect(roomsService.joinRoomWithinTransaction).not.toHaveBeenCalled(); // roomsServiceのモックが呼ばれていないことを確認
  });
});

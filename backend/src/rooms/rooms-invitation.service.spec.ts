import { ForbiddenException } from '@nestjs/common';
import { RoomInvitationStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma.service';
import { RoomsService } from './rooms.service';
import { RoomsInvitationService } from './rooms-invitation.service';
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

describe('RoomsInvitationService', () => {
  let service: RoomsInvitationService;
  let roomsService: jest.Mocked<RoomsService>;

  const prisma = {
    user: { findUnique: jest.fn() },
    friendship: { findFirst: jest.fn() },
    roomInvitation: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const dummyRoom: Room = {
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

  beforeEach(() => {
    jest.clearAllMocks();

    roomsService = {
      getRoomOrThrow: jest.fn().mockReturnValue(dummyRoom),
      join: jest.fn(),
    } as any;

    service = new RoomsInvitationService(
      prisma as unknown as PrismaService,
      roomsService,
    );
  });

  it('creates a pending room invitation for a friend', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: guest.id });
    prisma.friendship.findFirst.mockResolvedValue({ id: 'friendship-1' });
    prisma.roomInvitation.findFirst.mockResolvedValue(null);
    prisma.roomInvitation.create.mockResolvedValue({
      id: 'invitation-1',
      roomId: dummyRoom.id,
      inviterId: user.id,
      inviteeId: guest.id,
      status: RoomInvitationStatus.PENDING,
      inviter: user,
      invitee: guest,
    });

    const result = await service.createInvitation(dummyRoom.id, user.id, {
      inviteeId: guest.id,
    });

    expect(prisma.roomInvitation.create).toHaveBeenCalled();
    expect(result.status).toBe('pending');
  });

  it('rejects room invitations to users who are not friends', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: guest.id });
    prisma.friendship.findFirst.mockResolvedValue(null); // フレンドではない

    await expect(
      service.createInvitation(dummyRoom.id, user.id, { inviteeId: guest.id }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('accepts a pending invitation and delegates room join', async () => {
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
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    prisma.$transaction.mockImplementation(
      async (callback: (transaction: typeof tx) => Promise<unknown>) =>
        await callback(tx),
    );

    const expectedJoinedRoomResponse = {
      id: 'room-1',
      name: 'Test Room',
      players: [],
    };
    roomsService.join.mockResolvedValue(expectedJoinedRoomResponse as any);

    const result = await service.acceptInvitation('invitation-1', guest.id);

    expect(roomsService.join).toHaveBeenCalledWith('room-1', guest.id);
    expect(result).toEqual(expectedJoinedRoomResponse);
  });

  it('declines a pending invitation with a guarded status update', async () => {
    prisma.roomInvitation.findUnique.mockResolvedValue({
      inviteeId: guest.id,
      status: RoomInvitationStatus.PENDING,
    });
    prisma.roomInvitation.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.declineInvitation('invitation-1', guest.id);
    expect(result).toEqual({ message: 'Room invitation declined.' });
  });
});

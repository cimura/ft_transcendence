import {
  FriendRequestStatus,
  RoomInvitationStatus,
} from '../generated/prisma/enums';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const prisma = {
    friendship: {
      findMany: jest.fn(),
    },
    roomInvitation: {
      findMany: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationsService(prisma as unknown as PrismaService);
  });

  it('aggregates pending friend requests and room invitations newest first', async () => {
    prisma.friendship.findMany.mockResolvedValue([
      {
        id: 'friendship-1',
        createdAt: new Date('2026-07-02T09:00:00.000Z'),
        requester: {
          id: 'user-alice',
          username: 'alice',
          avatarUrl: null,
        },
      },
    ]);
    prisma.roomInvitation.findMany.mockResolvedValue([
      {
        id: 'invitation-1',
        createdAt: new Date('2026-07-02T10:00:00.000Z'),
        inviter: {
          id: 'user-bob',
          username: 'bob',
          avatarUrl: '/uploads/bob.png',
        },
        room: {
          id: 'room-1',
          name: 'Bob Room',
        },
      },
    ]);

    const result = await service.findAll('current-user');

    expect(prisma.friendship.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          receiverId: 'current-user',
          status: FriendRequestStatus.PENDING,
        },
      }),
    );
    expect(prisma.roomInvitation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          inviteeId: 'current-user',
          status: RoomInvitationStatus.PENDING,
        },
      }),
    );
    expect(result).toEqual([
      {
        id: 'invitation-1',
        type: 'room_invitation',
        createdAt: '2026-07-02T10:00:00.000Z',
        actor: {
          id: 'user-bob',
          username: 'bob',
          avatarUrl: '/uploads/bob.png',
        },
        room: {
          id: 'room-1',
          name: 'Bob Room',
        },
        invitationId: 'invitation-1',
      },
      {
        id: 'friendship-1',
        type: 'friend_request',
        createdAt: '2026-07-02T09:00:00.000Z',
        actor: {
          id: 'user-alice',
          username: 'alice',
          avatarUrl: null,
        },
        friendRequestId: 'friendship-1',
      },
    ]);
  });
});

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RoomsService } from './rooms.service';
import { RoomsStateService } from './rooms-state.service';
import { RoomsInvitationService } from './rooms-invitation.service';
import type { Room } from '../common/types/room.type';
import { RealtimeGateway } from '../websocket/realtime.gateway';

const user = {
  id: 'user-host',
  username: 'Host',
  avatarUrl: null,
};
const guest = {
  id: 'user-guest',
  username: 'Guest',
  avatarUrl: null,
};

describe('RoomsInvitationService', () => {
  let service: RoomsInvitationService;
  let roomsState: RoomsStateService;
  let roomsService: jest.Mocked<RoomsService>;
  let realtimeGateway: jest.Mocked<RealtimeGateway>;

  const prisma = {
    user: { findMany: jest.fn() },
    friendship: { findFirst: jest.fn() },
  };

  const buildRoom = (): Room => ({
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
  });

  beforeEach(() => {
    jest.clearAllMocks();

    roomsState = new RoomsStateService();
    roomsState.addRoom(buildRoom());

    roomsService = {
      getRoomOrThrow: jest.fn((roomId: string) => {
        const room = roomsState.getRoom(roomId);
        if (!room) throw new NotFoundException('Room not found');
        return room;
      }),
      join: jest.fn(),
    } as any;

    realtimeGateway = {
      emitNotificationForUser: jest.fn(),
    } as any;

    service = new RoomsInvitationService(
      prisma as unknown as PrismaService,
      roomsService,
      roomsState,
      realtimeGateway,
    );
  });

  it('creates a pending room invitation for a friend', async () => {
    prisma.user.findMany.mockResolvedValue([user, guest]);
    prisma.friendship.findFirst.mockResolvedValue({ id: 'friendship-1' });

    const result = await service.createInvitation('room-1', user.id, {
      inviteeId: guest.id,
    });

    expect(result.status).toBe('pending');
    expect(result.inviter.username).toBe('Host');
    expect(result.invitee.username).toBe('Guest');
    expect(result.room).toEqual({ id: 'room-1', name: 'Test Room' });
    expect(roomsState.getRoom('room-1')?.invitations[guest.id]).toBeDefined();
    expect(realtimeGateway.emitNotificationForUser).toHaveBeenCalledWith(
      guest.id,
      {
        id: result.id,
        type: 'room_invitation',
        createdAt: result.createdAt.toISOString(),
        actor: {
          id: user.id,
          username: user.username,
          avatarUrl: user.avatarUrl,
        },
        room: { id: 'room-1', name: 'Test Room' },
        invitationId: result.id,
      },
    );
  });

  it('returns the same invitation when invited twice', async () => {
    prisma.user.findMany.mockResolvedValue([user, guest]);
    prisma.friendship.findFirst.mockResolvedValue({ id: 'friendship-1' });

    const first = await service.createInvitation('room-1', user.id, {
      inviteeId: guest.id,
    });
    const second = await service.createInvitation('room-1', user.id, {
      inviteeId: guest.id,
    });

    expect(second.id).toBe(first.id);
    expect(realtimeGateway.emitNotificationForUser).toHaveBeenCalledTimes(1);
  });

  it('rejects room invitations to users who are not friends', async () => {
    prisma.user.findMany.mockResolvedValue([user, guest]);
    prisma.friendship.findFirst.mockResolvedValue(null); // フレンドではない

    await expect(
      service.createInvitation('room-1', user.id, { inviteeId: guest.id }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('accepts a pending invitation and delegates room join', async () => {
    prisma.user.findMany.mockResolvedValue([user, guest]);
    prisma.friendship.findFirst.mockResolvedValue({ id: 'friendship-1' });

    const invitation = await service.createInvitation('room-1', user.id, {
      inviteeId: guest.id,
    });

    const expectedJoinedRoomResponse = {
      id: 'room-1',
      name: 'Test Room',
      players: [],
    };
    roomsService.join.mockResolvedValue(expectedJoinedRoomResponse as any);

    const result = await service.acceptInvitation(invitation.id, guest.id);

    expect(roomsService.join).toHaveBeenCalledWith('room-1', guest.id);
    expect(result).toEqual(expectedJoinedRoomResponse);
    expect(roomsState.getRoom('room-1')?.invitations[guest.id]).toBeUndefined();
  });

  it('rejects accept when the friendship has been terminated', async () => {
    prisma.user.findMany.mockResolvedValue([user, guest]);
    prisma.friendship.findFirst.mockResolvedValueOnce({ id: 'friendship-1' }); // create 時

    const invitation = await service.createInvitation('room-1', user.id, {
      inviteeId: guest.id,
    });

    prisma.friendship.findFirst.mockResolvedValueOnce(null); // accept 時: フレンド解消済み

    await expect(
      service.acceptInvitation(invitation.id, guest.id),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'ROOM_INVITATION_NO_LONGER_ALLOWED',
      }),
    });
  });

  it('rejects accept when the room no longer exists', async () => {
    prisma.user.findMany.mockResolvedValue([user, guest]);
    prisma.friendship.findFirst.mockResolvedValue({ id: 'friendship-1' });

    const invitation = await service.createInvitation('room-1', user.id, {
      inviteeId: guest.id,
    });

    roomsState.deleteRoom('room-1');

    await expect(
      service.acceptInvitation(invitation.id, guest.id),
    ).rejects.toThrow(NotFoundException);
  });

  it('declines a pending invitation and removes it', async () => {
    prisma.user.findMany.mockResolvedValue([user, guest]);
    prisma.friendship.findFirst.mockResolvedValue({ id: 'friendship-1' });

    const invitation = await service.createInvitation('room-1', user.id, {
      inviteeId: guest.id,
    });

    const result = await service.declineInvitation(invitation.id, guest.id);

    expect(result).toEqual({ message: 'Room invitation declined.' });
    expect(roomsState.getRoom('room-1')?.invitations[guest.id]).toBeUndefined();

    await expect(
      service.declineInvitation(invitation.id, guest.id),
    ).rejects.toThrow(NotFoundException);
  });

  it('allows re-inviting after a decline', async () => {
    prisma.user.findMany.mockResolvedValue([user, guest]);
    prisma.friendship.findFirst.mockResolvedValue({ id: 'friendship-1' });

    const first = await service.createInvitation('room-1', user.id, {
      inviteeId: guest.id,
    });
    await service.declineInvitation(first.id, guest.id);

    const second = await service.createInvitation('room-1', user.id, {
      inviteeId: guest.id,
    });

    expect(second.id).not.toBe(first.id);
  });

  it('removes a pending invitation when the invitee joins by another path', async () => {
    prisma.user.findMany.mockResolvedValue([user, guest]);
    prisma.friendship.findFirst.mockResolvedValue({ id: 'friendship-1' });

    await service.createInvitation('room-1', user.id, {
      inviteeId: guest.id,
    });

    roomsState.addParticipant('room-1', {
      userId: guest.id,
      username: 'Guest',
      avatarUrl: null,
      isHost: false,
      isReady: false,
      joinedAt: new Date(),
    });

    expect(roomsState.getRoom('room-1')?.invitations[guest.id]).toBeUndefined();
  });
});

import { FriendsService } from './friends.service';
import { PrismaService } from '../prisma.service';
import { SocketPresenceService } from '../websocket/socket-presence.service';

describe('FriendsService', () => {
  it('includes the current presence status in the friends response', async () => {
    const prisma = {
      friendship: {
        findMany: jest.fn().mockResolvedValue([
          {
            requesterId: 'current-user',
            receiverId: 'friend-user',
            receiver: {
              id: 'friend-user',
              username: 'friend',
              avatarUrl: null,
            },
            requester: {
              id: 'current-user',
              username: 'current',
              avatarUrl: null,
            },
          },
        ]),
      },
    };
    const presence = {
      getStatus: jest.fn().mockReturnValue('online'),
    };
    const service = new FriendsService(
      prisma as unknown as PrismaService,
      presence as unknown as SocketPresenceService,
    );

    await expect(service.getFriends('current-user')).resolves.toEqual([
      {
        id: 'friend-user',
        username: 'friend',
        avatarUrl: null,
        status: 'online',
      },
    ]);
    expect(presence.getStatus).toHaveBeenCalledWith('friend-user');
  });
});

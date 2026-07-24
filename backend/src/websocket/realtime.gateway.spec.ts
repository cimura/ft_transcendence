import { SocketAuthService } from './socket-auth.service';
import { RealtimeGateway } from './realtime.gateway';

describe('RealtimeGateway', () => {
  const authService = {
    authenticate: jest.fn(),
  };
  const client = {
    id: 'socket-1',
    data: {} as { user?: { id: string } },
    join: jest.fn().mockResolvedValue(undefined),
    emit: jest.fn(),
    disconnect: jest.fn(),
  };
  const roomEmitter = {
    emit: jest.fn(),
  };
  const server = {
    to: jest.fn().mockReturnValue(roomEmitter),
  };

  let gateway: RealtimeGateway;

  beforeEach(() => {
    jest.clearAllMocks();
    authService.authenticate.mockReturnValue({ id: 'user-1' });

    gateway = new RealtimeGateway(authService as unknown as SocketAuthService);
    gateway.server = server as never;
    client.data = {};
  });

  it('authenticates the socket and joins the user room', async () => {
    await gateway.handleConnection(client as never);

    expect(client.join).toHaveBeenCalledWith('user:user-1');
    expect(client.data.user).toEqual({ id: 'user-1' });
  });

  it('sends a notification only to the requested user room', () => {
    const notification = {
      id: 'request-1',
      type: 'friend_request' as const,
      createdAt: '2026-07-19T00:00:00.000Z',
      actor: {
        id: 'requester-1',
        username: 'requester',
        avatarUrl: null,
      },
      friendRequestId: 'request-1',
    };

    gateway.emitNotificationForUser('invitee-1', notification);

    expect(server.to).toHaveBeenCalledWith('user:invitee-1');
    expect(roomEmitter.emit).toHaveBeenCalledWith(
      'notification:new',
      notification,
    );
  });
});

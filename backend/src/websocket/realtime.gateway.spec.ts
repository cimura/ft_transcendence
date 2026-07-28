import { SocketAuthService } from './socket-auth.service';
import { RealtimeGateway } from './realtime.gateway';
import { SocketPresenceService } from './socket-presence.service';

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
    emit: jest.fn(),
  };
  let presenceService: SocketPresenceService;

  let gateway: RealtimeGateway;

  beforeEach(() => {
    jest.clearAllMocks();
    presenceService = new SocketPresenceService();
    authService.authenticate.mockReturnValue({ id: 'user-1' });

    gateway = new RealtimeGateway(
      authService as unknown as SocketAuthService,
      presenceService,
    );
    gateway.server = server as never;
    client.data = {};
  });

  it('authenticates the socket and joins the user room', async () => {
    await gateway.handleConnection(client as never);

    expect(client.join).toHaveBeenCalledWith('user:user-1');
    expect(client.data.user).toEqual({ id: 'user-1' });
  });

  it('registers realtime presence after connecting', async () => {
    await gateway.handleConnection(client as never);

    expect(presenceService.getStatus('user-1')).toBe('online');
    expect(server.emit).toHaveBeenCalledWith('presence:updated', {
      userId: 'user-1',
      status: 'online',
    });
  });

  it('unregisters realtime presence after disconnecting', async () => {
    await gateway.handleConnection(client as never);
    server.emit.mockClear();

    gateway.handleDisconnect(client as never);

    expect(presenceService.getStatus('user-1')).toBe('offline');
    expect(server.emit).toHaveBeenCalledWith('presence:updated', {
      userId: 'user-1',
      status: 'offline',
    });
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

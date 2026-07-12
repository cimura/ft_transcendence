import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { SocketAuthService } from '../websocket/socket-auth.service';
import { SocketPresenceService } from '../websocket/socket-presence.service';

type TestSocket = Parameters<GameGateway['handleConnection']>[0];

const createSocket = (id: string): TestSocket =>
  ({
    id,
    data: {},
    disconnect: jest.fn(),
    emit: jest.fn(),
    join: jest.fn().mockResolvedValue(undefined),
    leave: jest.fn().mockResolvedValue(undefined),
  }) as unknown as TestSocket;

describe('GameGateway', () => {
  let gateway: GameGateway;
  let gameService: {
    setServer: jest.Mock;
    handleGameJoin: jest.Mock;
    handleGameLeave: jest.Mock;
    handlePlayerInput: jest.Mock;
    handleBombPlace: jest.Mock;
  };
  let socketAuthService: {
    authenticate: jest.Mock;
  };
  let socketPresenceService: SocketPresenceService;

  beforeEach(() => {
    gameService = {
      setServer: jest.fn(),
      handleGameJoin: jest.fn().mockReturnValue({}),
      handleGameLeave: jest.fn(),
      handlePlayerInput: jest.fn(),
      handleBombPlace: jest.fn(),
    };
    socketAuthService = {
      authenticate: jest.fn().mockReturnValue({ id: 'user-1' }),
    };
    socketPresenceService = new SocketPresenceService();
    gateway = new GameGateway(
      gameService as unknown as GameService,
      socketAuthService as unknown as SocketAuthService,
      socketPresenceService,
    );
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  it('disconnects unauthenticated clients', () => {
    const client = createSocket('socket-1');
    socketAuthService.authenticate.mockReturnValue(null);

    gateway.handleConnection(client);

    expect(client.disconnect).toHaveBeenCalledTimes(1);
    expect(client.data.user).toBeUndefined();
  });

  it('removes a player only when the last socket leaves the room', async () => {
    const firstClient = createSocket('socket-1');
    const secondClient = createSocket('socket-2');

    gateway.handleConnection(firstClient);
    gateway.handleConnection(secondClient);
    await gateway.handleJoin({ roomId: 'room-a' }, firstClient);
    await gateway.handleJoin({ roomId: 'room-a' }, secondClient);

    await gateway.handleLeave(firstClient);
    expect(gameService.handleGameLeave).not.toHaveBeenCalled();

    await gateway.handleLeave(secondClient);
    expect(gameService.handleGameLeave).toHaveBeenCalledWith(
      'user-1',
      'room-a',
    );
  });

  it('does not leave the game when another socket reconnects during the grace period', async () => {
    jest.useFakeTimers();
    const disconnectedClient = createSocket('socket-1');
    const reconnectedClient = createSocket('socket-2');

    gateway.handleConnection(disconnectedClient);
    await gateway.handleJoin({ roomId: 'room-a' }, disconnectedClient);
    gateway.handleDisconnect(disconnectedClient);

    gateway.handleConnection(reconnectedClient);
    await gateway.handleJoin({ roomId: 'room-a' }, reconnectedClient);
    jest.advanceTimersByTime(2000);
    await Promise.resolve();

    expect(gameService.handleGameLeave).not.toHaveBeenCalled();
  });

  it('keeps the current room state when joining a new room fails', async () => {
    const client = createSocket('socket-1');
    gateway.handleConnection(client);
    await gateway.handleJoin({ roomId: 'room-a' }, client);
    client.join.mockRejectedValueOnce(new Error('join failed'));

    await gateway.handleJoin({ roomId: 'room-b' }, client);

    expect(client.data.roomId).toBe('room-a');
    expect(client.leave).not.toHaveBeenCalled();
    expect(gameService.handleGameLeave).not.toHaveBeenCalled();
    expect(client.emit).toHaveBeenLastCalledWith('game:error', {
      code: 'ROOM_JOIN_FAILED',
      message: 'ゲームルームへの参加に失敗しました',
    });
  });
});

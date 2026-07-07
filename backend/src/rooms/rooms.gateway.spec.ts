import { JwtService } from '@nestjs/jwt';
import { RoomsService } from './rooms.service';
import { RoomsGateway } from './rooms.gateway';

const userId = 'user-1';
const roomId = 'room-1';

const chatMessage = {
  id: 'message-1',
  roomId,
  userId,
  username: 'User One',
  avatarUrl: null,
  text: 'hello',
  createdAt: '2026-07-07T00:00:00.000Z',
};

type RoomsGatewayClient = Parameters<RoomsGateway['handleJoinChat']>[1];

describe('RoomsGateway', () => {
  let gateway: RoomsGateway;
  let roomsService: {
    findAll: jest.Mock;
    findSocketMessages: jest.Mock;
    createSocketMessage: jest.Mock;
  };
  let jwtService: {
    verify: jest.Mock;
  };
  let serverEmit: jest.Mock;
  let serverTo: jest.Mock;
  let consoleLogSpy: jest.SpyInstance;

  const createClient = (
    options: {
      token?: string;
      data?: Record<string, unknown>;
    } = {},
  ) =>
    ({
      id: 'socket-1',
      data: options.data ?? {},
      handshake: {
        auth: options.token ? { token: options.token } : {},
      },
      join: jest.fn().mockResolvedValue(undefined),
      leave: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn(),
    }) as unknown as RoomsGatewayClient;

  beforeEach(() => {
    roomsService = {
      findAll: jest.fn(),
      findSocketMessages: jest.fn(),
      createSocketMessage: jest.fn(),
    };
    jwtService = {
      verify: jest.fn().mockReturnValue({ sub: userId }),
    };
    serverEmit = jest.fn();
    serverTo = jest.fn().mockReturnValue({ emit: serverEmit });

    gateway = new RoomsGateway(
      roomsService as unknown as RoomsService,
      jwtService as unknown as JwtService,
    );
    gateway.server = { to: serverTo } as any;
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('joins a room chat and sends existing history to the client', async () => {
    const client = createClient({ token: 'Bearer token-1' });
    roomsService.findSocketMessages.mockResolvedValue([chatMessage]);

    await gateway.handleJoinChat({ roomId }, client);

    expect(jwtService.verify).toHaveBeenCalledWith('token-1');
    expect(roomsService.findSocketMessages).toHaveBeenCalledWith(
      roomId,
      userId,
    );
    expect(client.join).toHaveBeenCalledWith(`room:${roomId}`);
    expect(client.data.chatRoomId).toBe(roomId);
    expect(client.emit).toHaveBeenCalledWith('chat:history', {
      roomId,
      messages: [chatMessage],
    });
  });

  it('leaves the previous room when joining another room chat', async () => {
    const client = createClient({
      token: 'Bearer token-1',
      data: { chatRoomId: 'room-old' },
    });
    roomsService.findSocketMessages.mockResolvedValue([]);

    await gateway.handleJoinChat({ roomId }, client);

    expect(client.leave).toHaveBeenCalledWith('room:room-old');
    expect(client.join).toHaveBeenCalledWith(`room:${roomId}`);
    expect(client.data.chatRoomId).toBe(roomId);
  });

  it('creates and broadcasts a chat message to the requested room', async () => {
    const client = createClient({
      token: 'Bearer token-1',
      data: { chatRoomId: roomId },
    });
    const ack = jest.fn();
    roomsService.createSocketMessage.mockResolvedValue(chatMessage);

    await gateway.handleChatMessage({ roomId, text: 'hello' }, client, ack);

    expect(roomsService.createSocketMessage).toHaveBeenCalledWith(
      roomId,
      userId,
      'hello',
    );
    expect(serverTo).toHaveBeenCalledWith(`room:${roomId}`);
    expect(serverEmit).toHaveBeenCalledWith('chat:message', chatMessage);
    expect(ack).toHaveBeenCalledWith({ ok: true });
  });

  it('joins the room before broadcasting when the client has not joined chat yet', async () => {
    const client = createClient({ token: 'Bearer token-1' });
    roomsService.createSocketMessage.mockResolvedValue(chatMessage);

    await gateway.handleChatMessage({ roomId, text: 'hello' }, client);

    expect(client.join).toHaveBeenCalledWith(`room:${roomId}`);
    expect(client.data.chatRoomId).toBe(roomId);
    expect(serverTo).toHaveBeenCalledWith(`room:${roomId}`);
  });

  it('rejects chat messages without a token', async () => {
    const client = createClient();
    const ack = jest.fn();

    await gateway.handleChatMessage({ roomId, text: 'hello' }, client, ack);

    expect(roomsService.createSocketMessage).not.toHaveBeenCalled();
    expect(client.emit).toHaveBeenCalledWith('chat:error', {
      message: 'Authentication token is required',
    });
    expect(ack).toHaveBeenCalledWith({
      ok: false,
      error: 'Authentication token is required',
    });
  });

  it('rejects empty chat messages before calling the service', async () => {
    const client = createClient({ token: 'Bearer token-1' });
    const ack = jest.fn();

    await gateway.handleChatMessage({ roomId, text: '   ' }, client, ack);

    expect(roomsService.createSocketMessage).not.toHaveBeenCalled();
    expect(client.emit).toHaveBeenCalledWith('chat:error', {
      message: 'Message content is required',
    });
    expect(ack).toHaveBeenCalledWith({
      ok: false,
      error: 'Message content is required',
    });
  });
});

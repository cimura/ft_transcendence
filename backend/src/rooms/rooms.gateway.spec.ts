import { ConflictException, NotFoundException } from '@nestjs/common';
import { RoomsGateway } from './rooms.gateway';
import { RoomsService } from './rooms.service';
import { SocketAuthService } from '../websocket/socket-auth.service';
import { SocketPresenceService } from '../websocket/socket-presence.service';

type TestSocket = Parameters<RoomsGateway['handleConnection']>[0];

const createSocket = (id: string): TestSocket =>
  ({
    id,
    data: {},
    disconnect: jest.fn(),
    emit: jest.fn(),
    join: jest.fn().mockResolvedValue(undefined),
    leave: jest.fn().mockResolvedValue(undefined),
  }) as unknown as TestSocket;

describe('RoomsGateway', () => {
  let gateway: RoomsGateway;
  let roomsService: { leave: jest.Mock };
  let socketAuthService: { authenticate: jest.Mock };
  let socketPresenceService: SocketPresenceService;
  let emitMock: jest.Mock;
  let toMock: jest.Mock;

  beforeEach(() => {
    roomsService = {
      leave: jest.fn(),
    };
    socketAuthService = {
      authenticate: jest.fn().mockReturnValue({ id: 'user-1' }),
    };
    socketPresenceService = new SocketPresenceService();
    gateway = new RoomsGateway(
      roomsService as unknown as RoomsService,
      socketAuthService as unknown as SocketAuthService,
      socketPresenceService,
    );

    emitMock = jest.fn();
    toMock = jest.fn().mockReturnValue({ emit: emitMock });
    gateway.server = { to: toMock } as unknown as RoomsGateway['server'];
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('disconnects unauthenticated clients', () => {
      const client = createSocket('socket-1');
      socketAuthService.authenticate.mockReturnValue(null);

      gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalledTimes(1);
      expect(client.data.user).toBeUndefined();
    });

    it('stores the authenticated user on the socket', () => {
      const client = createSocket('socket-1');

      gateway.handleConnection(client);

      expect(client.data.user).toEqual({ id: 'user-1' });
      expect(client.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('handleJoinRoom', () => {
    it('does nothing when roomId is missing', async () => {
      const client = createSocket('socket-1');
      gateway.handleConnection(client);

      await gateway.handleJoinRoom(client, {});

      expect(client.join).not.toHaveBeenCalled();
    });

    it('rejects unauthenticated sockets', async () => {
      const client = createSocket('socket-1');

      await gateway.handleJoinRoom(client, { roomId: 'room-a' });

      expect(client.emit).toHaveBeenCalledWith('room:error', {
        message: 'Unauthenticated socket',
      });
      expect(client.disconnect).toHaveBeenCalledTimes(1);
      expect(client.join).not.toHaveBeenCalled();
    });

    it('joins the requested room and registers presence', async () => {
      const client = createSocket('socket-1');
      gateway.handleConnection(client);

      await gateway.handleJoinRoom(client, { roomId: 'room-a' });

      expect(client.join).toHaveBeenCalledWith('room-a');
      expect(client.data.roomId).toBe('room-a');
    });

    it('keeps the current room state when joining a new room fails', async () => {
      const client = createSocket('socket-1');
      gateway.handleConnection(client);
      await gateway.handleJoinRoom(client, { roomId: 'room-a' });
      client.join.mockRejectedValueOnce(new Error('join failed'));

      await gateway.handleJoinRoom(client, { roomId: 'room-b' });

      expect(client.data.roomId).toBe('room-a');
      expect(client.leave).not.toHaveBeenCalled();
      expect(roomsService.leave).not.toHaveBeenCalled();
      expect(client.emit).toHaveBeenLastCalledWith('room:error', {
        message: 'ルームへの参加に失敗しました',
      });
    });

    it('leaves the previous room after the grace period when switching rooms', async () => {
      jest.useFakeTimers();
      roomsService.leave.mockResolvedValue({ id: 'room-a', roomId: 'room-a' });
      const client = createSocket('socket-1');
      gateway.handleConnection(client);
      await gateway.handleJoinRoom(client, { roomId: 'room-a' });

      await gateway.handleJoinRoom(client, { roomId: 'room-b' });
      expect(roomsService.leave).not.toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(2000);

      expect(roomsService.leave).toHaveBeenCalledWith('room-a', 'user-1');
      expect(client.leave).toHaveBeenCalledWith('room-a');
    });

    it('does not leave the previous room when another socket for the same user rejoins during the grace period', async () => {
      jest.useFakeTimers();
      const client = createSocket('socket-1');
      const otherClient = createSocket('socket-2');
      gateway.handleConnection(client);
      gateway.handleConnection(otherClient);
      await gateway.handleJoinRoom(client, { roomId: 'room-a' });

      await gateway.handleJoinRoom(client, { roomId: 'room-b' });
      await gateway.handleJoinRoom(otherClient, { roomId: 'room-a' });

      await jest.advanceTimersByTimeAsync(2000);

      expect(roomsService.leave).not.toHaveBeenCalled();
    });
  });

  describe('handleLeaveRoom', () => {
    it('does nothing when the socket has not joined a room', async () => {
      const client = createSocket('socket-1');
      gateway.handleConnection(client);

      await gateway.handleLeaveRoom(client);

      expect(client.leave).not.toHaveBeenCalled();
    });

    it('unregisters presence and leaves the room', async () => {
      const client = createSocket('socket-1');
      gateway.handleConnection(client);
      await gateway.handleJoinRoom(client, { roomId: 'room-a' });

      await gateway.handleLeaveRoom(client);

      expect(client.leave).toHaveBeenCalledWith('room-a');
      expect(client.data.roomId).toBeUndefined();
    });
  });

  describe('handleDisconnect', () => {
    it('does nothing when the socket never joined a room', () => {
      const client = createSocket('socket-1');
      gateway.handleConnection(client);

      gateway.handleDisconnect(client);

      expect(roomsService.leave).not.toHaveBeenCalled();
    });

    it('leaves the room after the grace period elapses and emits room:updated', async () => {
      jest.useFakeTimers();
      roomsService.leave.mockResolvedValue({ id: 'room-a' });
      const client = createSocket('socket-1');
      gateway.handleConnection(client);
      await gateway.handleJoinRoom(client, { roomId: 'room-a' });

      gateway.handleDisconnect(client);
      await jest.advanceTimersByTimeAsync(2000);

      expect(roomsService.leave).toHaveBeenCalledWith('room-a', 'user-1');
      expect(toMock).toHaveBeenCalledWith('room-a');
      expect(emitMock).toHaveBeenCalledWith('room:updated', { id: 'room-a' });
    });

    it('emits room:deleted when the room was removed', async () => {
      jest.useFakeTimers();
      roomsService.leave.mockResolvedValue({
        deleted: true,
        roomId: 'room-a',
      });
      const client = createSocket('socket-1');
      gateway.handleConnection(client);
      await gateway.handleJoinRoom(client, { roomId: 'room-a' });

      gateway.handleDisconnect(client);
      await jest.advanceTimersByTimeAsync(2000);

      expect(emitMock).toHaveBeenCalledWith('room:deleted', {
        roomId: 'room-a',
      });
    });

    it('does not leave the room when the same socket reconnects during the grace period', async () => {
      jest.useFakeTimers();
      const client = createSocket('socket-1');
      const reconnectedClient = createSocket('socket-2');
      gateway.handleConnection(client);
      await gateway.handleJoinRoom(client, { roomId: 'room-a' });

      gateway.handleDisconnect(client);

      gateway.handleConnection(reconnectedClient);
      await gateway.handleJoinRoom(reconnectedClient, { roomId: 'room-a' });
      await jest.advanceTimersByTimeAsync(2000);

      expect(roomsService.leave).not.toHaveBeenCalled();
    });

    it('silently ignores expected exceptions from roomsService.leave', async () => {
      jest.useFakeTimers();
      roomsService.leave.mockRejectedValue(
        new ConflictException('Only waiting rooms can be left'),
      );
      const client = createSocket('socket-1');
      gateway.handleConnection(client);
      await gateway.handleJoinRoom(client, { roomId: 'room-a' });

      gateway.handleDisconnect(client);
      await jest.advanceTimersByTimeAsync(2000);

      expect(emitMock).not.toHaveBeenCalled();
    });

    it('logs unexpected errors from roomsService.leave without throwing', async () => {
      jest.useFakeTimers();
      const loggerErrorSpy = jest
        .spyOn(
          (gateway as unknown as { logger: { error: () => void } }).logger,
          'error',
        )
        .mockImplementation(() => undefined);
      roomsService.leave.mockRejectedValue(new NotFoundException());
      roomsService.leave.mockRejectedValueOnce(new Error('db unavailable'));
      const client = createSocket('socket-1');
      gateway.handleConnection(client);
      await gateway.handleJoinRoom(client, { roomId: 'room-a' });

      gateway.handleDisconnect(client);
      await jest.advanceTimersByTimeAsync(2000);

      expect(loggerErrorSpy).toHaveBeenCalled();
    });
  });

  describe('emitRoomUpdated / emitRoomDeleted', () => {
    it('emits room:updated to the room channel', () => {
      const room = { id: 'room-a' } as Parameters<
        RoomsGateway['emitRoomUpdated']
      >[0];

      gateway.emitRoomUpdated(room);

      expect(toMock).toHaveBeenCalledWith('room-a');
      expect(emitMock).toHaveBeenCalledWith('room:updated', room);
    });

    it('emits room:deleted to the room channel', () => {
      gateway.emitRoomDeleted('room-a');

      expect(toMock).toHaveBeenCalledWith('room-a');
      expect(emitMock).toHaveBeenCalledWith('room:deleted', {
        roomId: 'room-a',
      });
    });
  });
});

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

const createDeferred = <T>() => {
  let resolve: (value: T) => void;
  let reject: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve: resolve!, reject: reject! };
};

describe('RoomsGateway', () => {
  let gateway: RoomsGateway;
  let roomsService: {
    findAll: jest.Mock;
    findSocketMessages: jest.Mock;
    createSocketMessage: jest.Mock;
  };
  let socketAuthService: {
    authenticate: jest.Mock;
  };
  let socketPresenceService: {
    register: jest.Mock;
    unregister: jest.Mock;
    scheduleIfInactive: jest.Mock;
  };
  let serverEmit: jest.Mock;
  let serverTo: jest.Mock;

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
    socketAuthService = {
      authenticate: jest.fn((client) =>
        client.handshake.auth.token ? { id: userId } : null,
      ),
    };
    socketPresenceService = {
      register: jest.fn(),
      unregister: jest.fn().mockReturnValue(0),
      scheduleIfInactive: jest.fn(),
    };
    serverEmit = jest.fn();
    serverTo = jest.fn().mockReturnValue({ emit: serverEmit });

    gateway = new RoomsGateway(
      roomsService as unknown as RoomsService,
      socketAuthService as unknown as SocketAuthService,
      socketPresenceService as unknown as SocketPresenceService,
    );
    gateway.server = { to: serverTo } as any;
  });

  it('joins a room chat and sends existing history to the client', async () => {
    const client = createClient({ token: 'Bearer token-1' });
    roomsService.findSocketMessages.mockResolvedValue([chatMessage]);

    await gateway.handleJoinChat({ roomId }, client);

    expect(socketAuthService.authenticate).toHaveBeenCalledWith(client);
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

  it('keeps the previous room joined when joining another room chat is rejected', async () => {
    const client = createClient({
      token: 'Bearer token-1',
      data: { chatRoomId: 'room-old' },
    });
    roomsService.findSocketMessages.mockRejectedValue(
      new Error('You are not a participant of this room'),
    );

    await gateway.handleJoinChat({ roomId }, client);

    expect(client.leave).not.toHaveBeenCalled();
    expect(client.join).not.toHaveBeenCalled();
    expect(client.data.chatRoomId).toBe('room-old');
    expect(client.emit).toHaveBeenCalledWith('chat:error', {
      message: 'You are not a participant of this room',
    });
  });

  it('serializes chat events for the same socket', async () => {
    const client = createClient({
      token: 'Bearer token-1',
      data: { chatRoomId: 'room-old' },
    });
    const history = createDeferred<(typeof chatMessage)[]>();
    const message = { ...chatMessage, roomId: 'room-3' };
    roomsService.findSocketMessages.mockReturnValue(history.promise);
    roomsService.createSocketMessage.mockResolvedValue(message);

    const join = gateway.handleJoinChat({ roomId: 'room-2' }, client);
    const send = gateway.handleChatMessage(
      { roomId: 'room-3', text: 'hello' },
      client,
    );

    await Promise.resolve();
    expect(roomsService.createSocketMessage).not.toHaveBeenCalled();

    history.resolve([]);
    await Promise.all([join, send]);

    expect(client.leave).toHaveBeenNthCalledWith(1, 'room:room-old');
    expect(client.join).toHaveBeenNthCalledWith(1, 'room:room-2');
    expect(client.leave).toHaveBeenNthCalledWith(2, 'room:room-2');
    expect(client.join).toHaveBeenNthCalledWith(2, 'room:room-3');
    expect(client.data.chatRoomId).toBe('room-3');
  });

  it('runs chat:leave after an in-flight chat:join for the same socket', async () => {
    const client = createClient({
      token: 'Bearer token-1',
      data: { chatRoomId: 'room-old' },
    });
    const history = createDeferred<(typeof chatMessage)[]>();
    roomsService.findSocketMessages.mockReturnValue(history.promise);

    const join = gateway.handleJoinChat({ roomId: 'room-2' }, client);
    const leave = gateway.handleLeaveChat({ roomId: 'room-2' }, client);

    history.resolve([]);
    await Promise.all([join, leave]);

    expect(client.join).toHaveBeenCalledWith('room:room-2');
    expect(client.leave).toHaveBeenNthCalledWith(1, 'room:room-old');
    expect(client.leave).toHaveBeenNthCalledWith(2, 'room:room-2');
    expect(client.data.chatRoomId).toBeUndefined();
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

  it('leaves the previous room before joining another room when sending a chat message', async () => {
    const client = createClient({
      token: 'Bearer token-1',
      data: { chatRoomId: 'room-old' },
    });
    roomsService.createSocketMessage.mockResolvedValue(chatMessage);

    await gateway.handleChatMessage({ roomId, text: 'hello' }, client);

    expect(client.leave).toHaveBeenCalledWith('room:room-old');
    expect(client.join).toHaveBeenCalledWith(`room:${roomId}`);
    expect(client.data.chatRoomId).toBe(roomId);
    expect(
      (client.leave as unknown as jest.Mock).mock.invocationCallOrder[0],
    ).toBeLessThan(
      (client.join as unknown as jest.Mock).mock.invocationCallOrder[0],
    );
    expect(serverTo).toHaveBeenCalledWith(`room:${roomId}`);
  });

  it('keeps the previous room joined when sending a chat message is rejected', async () => {
    const client = createClient({
      token: 'Bearer token-1',
      data: { chatRoomId: 'room-old' },
    });
    const ack = jest.fn();
    roomsService.createSocketMessage.mockRejectedValue(
      new Error('You are not a participant of this room'),
    );

    await gateway.handleChatMessage({ roomId, text: 'hello' }, client, ack);

    expect(client.leave).not.toHaveBeenCalled();
    expect(client.join).not.toHaveBeenCalled();
    expect(client.data.chatRoomId).toBe('room-old');
    expect(client.emit).toHaveBeenCalledWith('chat:error', {
      message: 'You are not a participant of this room',
    });
    expect(ack).toHaveBeenCalledWith({
      ok: false,
      error: 'You are not a participant of this room',
    });
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

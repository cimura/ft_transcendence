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
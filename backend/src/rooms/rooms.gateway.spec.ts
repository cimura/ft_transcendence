import { Test, TestingModule } from '@nestjs/testing';
import { RoomsGateway } from './rooms.gateway';
import { SocketAuthService } from '../websocket/socket-auth.service';
import { RoomsChatService } from './rooms-chat.service';
import type { RoomResponse } from '../common/types/room.type';

describe('RoomsGateway', () => {
  let gateway: RoomsGateway;
  let socketAuthService: jest.Mocked<SocketAuthService>;
  let roomsChatService: jest.Mocked<RoomsChatService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsGateway,
        { provide: SocketAuthService, useValue: { authenticate: jest.fn() } },
        {
          provide: RoomsChatService,
          useValue: {
            findMessages: jest.fn(),
            createMessage: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<RoomsGateway>(RoomsGateway);
    socketAuthService = module.get(SocketAuthService);
    roomsChatService = module.get(RoomsChatService);

    gateway.server = {
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
      emit: jest.fn(),
    } as any;
  });

  const createMockSocket = (): any => ({
    id: 'socket-1',
    data: {},
    handshake: { auth: {} },
    join: jest.fn(),
    leave: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('認証に失敗した場合は切断する', () => {
      const client = createMockSocket();
      socketAuthService.authenticate.mockReturnValue(null);
      gateway.handleConnection(client);
      expect(client.disconnect).toHaveBeenCalled();
    });

    it('認証に成功した場合はユーザーデータをセットする', () => {
      const client = createMockSocket();
      socketAuthService.authenticate.mockReturnValue({ id: 'user-1' });
      gateway.handleConnection(client);
      expect(client.data.user).toEqual({ id: 'user-1' });
    });
  });

  describe('handleRoomJoin', () => {
    it('指定のルームに参加する', () => {
      const client = createMockSocket();
      gateway.handleRoomJoin(client, { roomId: 'room-1' });
      expect(client.join).toHaveBeenCalledWith('room-1');
      expect(client.data.roomId).toBe('room-1');
    });

    it('既に別のルームに参加している場合は退出してから新しいルームに参加する', () => {
      const client = createMockSocket();
      client.data.roomId = 'room-0';
      gateway.handleRoomJoin(client, { roomId: 'room-1' });
      expect(client.leave).toHaveBeenCalledWith('room-0');
      expect(client.join).toHaveBeenCalledWith('room-1');
    });
  });

  describe('handleChatJoin', () => {
    it('チャットルームに参加し、履歴を送信する', async () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      roomsChatService.findMessages.mockResolvedValue([
        {
          id: 'msg-1',
          roomId: 'room-1',
          senderId: 'user-1',
          content: 'hello',
          createdAt: new Date('2026-07-01T00:00:00.000Z'),
          senderName: 'testuser',
          senderAvatarUrl: null,
        },
      ]);

      await gateway.handleChatJoin(client, { roomId: 'room-1' });

      expect(client.join).toHaveBeenCalledWith('chat:room-1');
      expect(client.emit).toHaveBeenCalledWith('chat:history', {
        roomId: 'room-1',
        messages: [
          {
            id: 'msg-1',
            roomId: 'room-1',
            userId: 'user-1',
            username: 'testuser',
            text: 'hello',
            createdAt: '2026-07-01T00:00:00.000Z',
          },
        ],
      });
    });
  });

  describe('handleChatMessage', () => {
    it('メッセージを作成し、ルーム内にブロードキャストして結果を返す', async () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      roomsChatService.createMessage.mockResolvedValue({
        id: 'msg-2',
        roomId: 'room-1',
        senderId: 'user-1',
        content: 'new message',
        createdAt: new Date('2026-07-01T00:00:00.000Z'),
        senderName: 'testuser',
        senderAvatarUrl: null,
      });

      const toMock = { emit: jest.fn() };
      jest.spyOn(gateway.server, 'to').mockReturnValue(toMock as any);

      const result = await gateway.handleChatMessage(client, {
        roomId: 'room-1',
        text: 'new message',
      });

      expect(toMock.emit).toHaveBeenCalledWith('chat:message', {
        id: 'msg-2',
        roomId: 'room-1',
        userId: 'user-1',
        username: 'testuser',
        text: 'new message',
        createdAt: '2026-07-01T00:00:00.000Z',
      });
      expect(result).toEqual({ ok: true });
    });
  });

  describe('emitRoomUpdated', () => {
    it('RoomResponseからRoomSnapshotを生成し、指定のルームにemitする', () => {
      const mockRoomResponse: RoomResponse = {
        id: 'room-1',
        gameId: 'game-1',
        name: 'test room',
        hostId: 'user-1',
        hostName: 'hostuser',
        maxPlayers: 2,
        status: 'waiting',
        mode: 'online',
        createdAt: new Date('2026-07-01T00:00:00.000Z'),
        updatedAt: new Date('2026-07-01T00:00:00.000Z'),
        startedAt: null,
        finishedAt: null,
        players: [
          {
            userId: 'user-1',
            username: 'hostuser',
            avatarUrl: null,
            isReady: true,
            isHost: true,
            joinedAt: new Date('2026-07-01T00:00:00.000Z'),
          },
        ],
      };

      const toMock = { emit: jest.fn() };
      jest.spyOn(gateway.server, 'to').mockReturnValue(toMock as any);

      gateway.emitRoomUpdated(mockRoomResponse);

      expect(gateway.server.to).toHaveBeenCalledWith('room-1');
      expect(toMock.emit).toHaveBeenCalledWith('room:updated', {
        id: 'room-1',
        gameId: 'game-1',
        name: 'test room',
        hostId: 'user-1',
        hostName: 'hostuser',
        maxPlayers: 2,
        status: 'waiting',
        mode: 'online',
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
        startedAt: undefined,
        finishedAt: undefined,
        players: [
          {
            userId: 'user-1',
            username: 'hostuser',
            avatarUrl: null,
            isReady: true,
            isHost: true,
            joinedAt: '2026-07-01T00:00:00.000Z',
          },
        ],
      });
    });
  });

  describe('emitRoomDeleted', () => {
    it('指定のルームに削除イベントをemitする', () => {
      const toMock = { emit: jest.fn() };
      jest.spyOn(gateway.server, 'to').mockReturnValue(toMock as any);

      gateway.emitRoomDeleted('room-1');

      expect(gateway.server.to).toHaveBeenCalledWith('room-1');
      expect(toMock.emit).toHaveBeenCalledWith('room:deleted', {
        roomId: 'room-1',
      });
    });
  });
});

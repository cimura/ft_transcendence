import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventEmitterModule, EventEmitter2 } from '@nestjs/event-emitter';
import { RoomsGateway } from './rooms.gateway';
import { SocketAuthService } from '../websocket/socket-auth.service';
import { SocketPresenceService } from '../websocket/socket-presence.service';
import { RoomsChatService } from './rooms-chat.service';
import { RoomsLobbyService } from './rooms-lobby.service';
import { RoomsService } from './rooms.service';
import type { RoomSnapshot } from '@ft_transcendence/shared/rooms-events.types';
import {
  ROOM_CREATED_EVENT,
  ROOM_UPDATED_EVENT,
  ROOM_DELETED_EVENT,
  RoomCreatedEvent,
  RoomUpdatedEvent,
  RoomDeletedEvent,
} from './events/room-domain-events';

describe('RoomsGateway', () => {
  let gateway: RoomsGateway;
  let socketAuthService: jest.Mocked<SocketAuthService>;
  let socketPresenceService: jest.Mocked<SocketPresenceService>;
  let roomsChatService: jest.Mocked<RoomsChatService>;
  let roomsLobbyService: jest.Mocked<RoomsLobbyService>;
  let roomsService: jest.Mocked<RoomsService>;
  let eventEmitter: EventEmitter2;

  const mockRoomSnapshot: RoomSnapshot = {
    id: 'room-1',
    name: 'test room',
    hostId: 'user-1',
    hostName: 'hostuser',
    maxPlayers: 2,
    status: 'waiting',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    startedAt: undefined,
    finishedAt: undefined,
    players: [
      {
        userId: 'user-1',
        username: 'hostuser',
        avatarUrl: undefined,
        isReady: true,
        isHost: true,
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        RoomsGateway,
        { provide: SocketAuthService, useValue: { authenticate: jest.fn() } },
        {
          provide: SocketPresenceService,
          useValue: {
            register: jest.fn(),
            unregister: jest.fn().mockReturnValue(0),
            scheduleIfInactive: jest.fn(),
          },
        },
        {
          provide: RoomsChatService,
          useValue: {
            findMessages: jest.fn(),
            createMessage: jest.fn(),
          },
        },
        {
          provide: RoomsLobbyService,
          useValue: {
            getLobbyRooms: jest.fn().mockReturnValue([]),
            isLobbyVisible: jest.fn(
              (room: RoomSnapshot) => room.status === 'waiting',
            ),
          },
        },
        {
          provide: RoomsService,
          useValue: {
            findOne: jest.fn(),
            canSubscribe: jest.fn().mockReturnValue(true),
            evictIfWaiting: jest.fn(),
          },
        },
      ],
    }).compile();
    // @OnEvent の購読登録は onApplicationBootstrap ライフサイクルで行われるため、
    // .compile() だけでなく .init() までモジュールを起動する必要がある
    await module.init();

    gateway = module.get<RoomsGateway>(RoomsGateway);
    socketAuthService = module.get(SocketAuthService);
    socketPresenceService = module.get(SocketPresenceService);
    roomsChatService = module.get(RoomsChatService);
    roomsLobbyService = module.get(RoomsLobbyService);
    roomsService = module.get(RoomsService);
    eventEmitter = module.get(EventEmitter2);

    gateway.server = {
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
      emit: jest.fn(),
    } as any;
  });

  const createMockSocket = (id = 'socket-1'): any => ({
    id,
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
    it('指定のルームに参加して最新スナップショットを返す', async () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      roomsService.findOne.mockReturnValue(mockRoomSnapshot);

      await gateway.handleRoomJoin(client, { roomId: 'room-1' });

      expect(roomsService.canSubscribe).toHaveBeenCalledWith(
        'room-1',
        'user-1',
      );
      expect(client.join).toHaveBeenCalledWith('room-1');
      expect(client.data.roomId).toBe('room-1');
      expect(socketPresenceService.register).toHaveBeenCalledWith({
        namespace: 'rooms',
        roomId: 'room-1',
        userId: 'user-1',
        socketId: 'socket-1',
      });
      expect(client.emit).toHaveBeenCalledWith(
        'room:updated',
        mockRoomSnapshot,
      );
    });

    it('client.join が完了した後にスナップショットを取得する(join前の古いスナップショット送信を防ぐ)', async () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      const callOrder: string[] = [];
      client.join.mockImplementation(() => {
        callOrder.push('join');
      });
      roomsService.findOne.mockImplementation(() => {
        callOrder.push('findOne');
        return mockRoomSnapshot;
      });

      await gateway.handleRoomJoin(client, { roomId: 'room-1' });

      expect(callOrder).toEqual(['join', 'findOne']);
    });

    it('既に別のルームに参加している場合は新しいルームに参加した後、旧ルームを後始末する', async () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      client.data.roomId = 'room-0';
      roomsService.findOne.mockReturnValue(mockRoomSnapshot);

      await gateway.handleRoomJoin(client, { roomId: 'room-1' });

      expect(client.join).toHaveBeenCalledWith('room-1');
      expect(client.data.roomId).toBe('room-1');
      expect(client.leave).toHaveBeenCalledWith('room-0');
      expect(socketPresenceService.unregister).toHaveBeenCalledWith({
        namespace: 'rooms',
        roomId: 'room-0',
        userId: 'user-1',
        socketId: 'socket-1',
      });
      // 非同意切断相当のため、猶予付きの自動退出が予約される
      expect(socketPresenceService.scheduleIfInactive).toHaveBeenCalled();
    });

    it('乗り換え中に失敗した場合は旧ルームの購読を維持する', async () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      client.data.roomId = 'room-0';
      client.emit.mockImplementation((event: string) => {
        if (event === 'room:updated') throw new Error('emit failed');
      });
      roomsService.findOne.mockReturnValue(mockRoomSnapshot);

      await gateway.handleRoomJoin(client, { roomId: 'room-1' });

      // 新ルームへの参加はロールバックされる
      expect(client.leave).toHaveBeenCalledWith('room-1');
      // 旧ルームの後始末(purge)は行われない
      expect(client.leave).not.toHaveBeenCalledWith('room-0');
      expect(socketPresenceService.unregister).not.toHaveBeenCalledWith(
        expect.objectContaining({ roomId: 'room-0' }),
      );
      expect(client.data.roomId).toBe('room-0');
      expect(client.emit).toHaveBeenCalledWith('room:error', {
        message: 'Failed to join room',
      });
    });

    it('未認証(client.data.user なし)の場合は購読しない', async () => {
      const client = createMockSocket();

      await gateway.handleRoomJoin(client, { roomId: 'room-1' });

      expect(roomsService.canSubscribe).not.toHaveBeenCalled();
      expect(client.join).not.toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith('room:error', {
        message: 'Cannot join room',
      });
    });

    it('canSubscribe が false の場合は現在のルームを退出せず、指定のルームにも参加しない', async () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-2' };
      client.data.roomId = 'room-0';
      roomsService.canSubscribe.mockReturnValue(false);

      await gateway.handleRoomJoin(client, { roomId: 'room-1' });

      expect(client.leave).not.toHaveBeenCalled();
      expect(client.join).not.toHaveBeenCalled();
      expect(client.data.roomId).toBe('room-0');
      expect(socketPresenceService.register).not.toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith('room:error', {
        message: 'Cannot join room',
      });
    });

    it('canSubscribe が NotFoundException を投げた場合は Room not found を通知する', async () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      roomsService.canSubscribe.mockImplementation(() => {
        throw new NotFoundException('Room not found');
      });

      await gateway.handleRoomJoin(client, { roomId: 'room-1' });

      expect(client.join).not.toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith('room:error', {
        message: 'Room not found',
      });
    });

    it('canSubscribe が想定外の例外を投げた場合は Room not found にせず Failed to join room を通知する', async () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      roomsService.canSubscribe.mockImplementation(() => {
        throw new Error('unexpected');
      });
      const errorSpy = jest
        .spyOn((gateway as any).logger, 'error')
        .mockImplementation(() => undefined);

      await gateway.handleRoomJoin(client, { roomId: 'room-1' });

      expect(client.join).not.toHaveBeenCalled();
      expect(client.emit).not.toHaveBeenCalledWith('room:error', {
        message: 'Room not found',
      });
      expect(client.emit).toHaveBeenCalledWith('room:error', {
        message: 'Failed to join room',
      });
      expect(errorSpy).toHaveBeenCalled();
    });

    it('join 後にルームが削除されていた場合は Room not found を通知し購読をロールバックする', async () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      roomsService.findOne.mockImplementation(() => {
        throw new NotFoundException('Room not found');
      });

      await gateway.handleRoomJoin(client, { roomId: 'room-1' });

      expect(client.join).toHaveBeenCalledWith('room-1');
      expect(client.leave).toHaveBeenCalledWith('room-1');
      expect(client.data.roomId).toBeUndefined();
      expect(client.emit).toHaveBeenCalledWith('room:error', {
        message: 'Room not found',
      });
    });

    it('Socket.IO room への参加失敗を通知する', async () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      client.join.mockRejectedValue(new Error('join failed'));
      roomsService.findOne.mockReturnValue(mockRoomSnapshot);

      await gateway.handleRoomJoin(client, { roomId: 'room-1' });

      expect(client.data.roomId).toBeUndefined();
      expect(socketPresenceService.register).not.toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith('room:error', {
        message: 'Failed to join room',
      });
    });

    it('presence 登録後の失敗時は room と presence をロールバックする', async () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      client.emit.mockImplementation((event: string) => {
        if (event === 'room:updated') throw new Error('emit failed');
      });
      roomsService.findOne.mockReturnValue(mockRoomSnapshot);

      await gateway.handleRoomJoin(client, { roomId: 'room-1' });

      expect(client.leave).toHaveBeenCalledWith('room-1');
      expect(client.data.roomId).toBeUndefined();
      expect(socketPresenceService.unregister).toHaveBeenCalledWith({
        namespace: 'rooms',
        roomId: 'room-1',
        userId: 'user-1',
        socketId: 'socket-1',
      });
      // 購読処理中の一時的な失敗は実際の切断ではないため、猶予付き自動退出を予約しない
      expect(socketPresenceService.scheduleIfInactive).not.toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith('room:error', {
        message: 'Failed to join room',
      });
    });
  });

  describe('handleRoomLeave / handleDisconnect', () => {
    it('handleDisconnect: 参加中のルームがあれば presence を解除する', () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      client.data.roomId = 'room-1';
      socketPresenceService.unregister.mockReturnValue(0);

      gateway.handleDisconnect(client);

      expect(socketPresenceService.unregister).toHaveBeenCalledWith({
        namespace: 'rooms',
        roomId: 'room-1',
        userId: 'user-1',
        socketId: 'socket-1',
      });
      expect(socketPresenceService.scheduleIfInactive).toHaveBeenCalled();
    });

    it('handleDisconnect: 参加中のルームがなければ何もしない', () => {
      const client = createMockSocket();
      gateway.handleDisconnect(client);
      expect(socketPresenceService.unregister).not.toHaveBeenCalled();
    });
  });

  describe('room:leave(明示的退出)', () => {
    it('presence を即座に解除し、猶予は挟まない(ドメイン退出は REST /leave の責務)', () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      client.data.roomId = 'room-1';
      socketPresenceService.unregister.mockReturnValue(0);

      gateway.handleRoomLeave(client);

      expect(client.leave).toHaveBeenCalledWith('room-1');
      expect(client.data.roomId).toBeUndefined();
      expect(socketPresenceService.unregister).toHaveBeenCalledWith({
        namespace: 'rooms',
        roomId: 'room-1',
        userId: 'user-1',
        socketId: 'socket-1',
      });
      // 明示的退出ではドメイン退出も猶予付き自動退出の予約もしない
      expect(roomsService.evictIfWaiting).not.toHaveBeenCalled();
      expect(socketPresenceService.scheduleIfInactive).not.toHaveBeenCalled();
    });

    it('同じユーザーの別タブが残っている場合は presence 解除もしない', () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      client.data.roomId = 'room-1';
      socketPresenceService.unregister.mockReturnValue(1);

      gateway.handleRoomLeave(client);

      expect(client.leave).toHaveBeenCalledWith('room-1');
      expect(roomsService.evictIfWaiting).not.toHaveBeenCalled();
      expect(socketPresenceService.scheduleIfInactive).not.toHaveBeenCalled();
    });

    it('参加中のルームがなければ何もしない', () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };

      gateway.handleRoomLeave(client);

      expect(client.leave).not.toHaveBeenCalled();
      expect(socketPresenceService.unregister).not.toHaveBeenCalled();
    });
  });

  describe('自動退出コールバック(切断からの猶予経過後・ゴーストルーム対策)', () => {
    const getScheduledCallback = () => {
      const call = socketPresenceService.scheduleIfInactive.mock.calls[0];
      return call[2];
    };

    it('猶予時間が過ぎたら RoomsService.evictIfWaiting を呼ぶ', () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      client.data.roomId = 'room-1';
      socketPresenceService.unregister.mockReturnValue(0);

      gateway.handleDisconnect(client);
      void getScheduledCallback()();

      // 「waiting かつ参加者本人か」の判定と実際の退出は RoomsService.evictIfWaiting が担う
      // (rooms.service.spec.ts の evictIfWaiting で検証済み)
      expect(roomsService.evictIfWaiting).toHaveBeenCalledWith(
        'room-1',
        'user-1',
      );
    });

    it('evictIfWaiting が例外を投げても伝播させず警告ログのみ残す', () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      client.data.roomId = 'room-1';
      socketPresenceService.unregister.mockReturnValue(0);
      roomsService.evictIfWaiting.mockImplementation(() => {
        throw new Error('boom');
      });
      const warnSpy = jest
        .spyOn((gateway as any).logger, 'warn')
        .mockImplementation(() => undefined);

      gateway.handleDisconnect(client);

      expect(() => getScheduledCallback()()).not.toThrow();
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe('lobby:join', () => {
    it('lobby ルームに参加し、現在のロビー一覧を送信する', async () => {
      const client = createMockSocket();
      roomsLobbyService.getLobbyRooms.mockReturnValue([mockRoomSnapshot]);

      await gateway.handleLobbyJoin(client);

      expect(client.join).toHaveBeenCalledWith('lobby');
      expect(client.emit).toHaveBeenCalledWith('lobby:rooms', [
        mockRoomSnapshot,
      ]);
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

    it('参加権限がない場合はログを残さずに chat:error を通知する', async () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      roomsChatService.findMessages.mockRejectedValue(
        new ForbiddenException('You are not a participant of this room'),
      );
      const errorSpy = jest
        .spyOn((gateway as any).logger, 'error')
        .mockImplementation(() => undefined);

      await gateway.handleChatJoin(client, { roomId: 'room-1' });

      expect(client.join).not.toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith('chat:error', {
        message: '履歴の取得に失敗しました',
      });
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('想定外の例外はログに残したうえで chat:error を通知する', async () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      roomsChatService.findMessages.mockRejectedValue(new Error('db down'));
      const errorSpy = jest
        .spyOn((gateway as any).logger, 'error')
        .mockImplementation(() => undefined);

      await gateway.handleChatJoin(client, { roomId: 'room-1' });

      expect(client.emit).toHaveBeenCalledWith('chat:error', {
        message: '履歴の取得に失敗しました',
      });
      expect(errorSpy).toHaveBeenCalled();
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

    it('想定外の例外は内部エラー文言を漏らさず汎用エラーを返し、ログを残す', async () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      roomsChatService.createMessage.mockRejectedValue(new Error('db down'));
      const errorSpy = jest
        .spyOn((gateway as any).logger, 'error')
        .mockImplementation(() => undefined);

      const result = await gateway.handleChatMessage(client, {
        roomId: 'room-1',
        text: 'new message',
      });

      expect(result).toEqual({
        ok: false,
        error: 'メッセージを送信できません',
      });
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('ドメインイベント → ブロードキャスト', () => {
    describe(`${ROOM_CREATED_EVENT} → room:created`, () => {
      it('waiting のルームは lobby へ配信する', () => {
        const toMock = { emit: jest.fn() };
        jest.spyOn(gateway.server, 'to').mockReturnValue(toMock as any);

        eventEmitter.emit(
          ROOM_CREATED_EVENT,
          new RoomCreatedEvent(mockRoomSnapshot),
        );

        expect(gateway.server.to).toHaveBeenCalledWith('lobby');
        expect(toMock.emit).toHaveBeenCalledWith(
          'room:created',
          mockRoomSnapshot,
        );
      });

      it('ロビーに表示すべきでないルームは配信しない', () => {
        const toMock = { emit: jest.fn() };
        jest.spyOn(gateway.server, 'to').mockReturnValue(toMock as any);
        roomsLobbyService.isLobbyVisible.mockReturnValueOnce(false);

        eventEmitter.emit(
          ROOM_CREATED_EVENT,
          new RoomCreatedEvent(mockRoomSnapshot),
        );

        expect(toMock.emit).not.toHaveBeenCalled();
      });
    });

    describe(`${ROOM_UPDATED_EVENT} → room:updated`, () => {
      it('ルームとロビー双方に RoomSnapshot を emit する', () => {
        const toMock = { emit: jest.fn() };
        jest.spyOn(gateway.server, 'to').mockReturnValue(toMock as any);

        eventEmitter.emit(
          ROOM_UPDATED_EVENT,
          new RoomUpdatedEvent(mockRoomSnapshot),
        );

        expect(gateway.server.to).toHaveBeenCalledWith('room-1');
        expect(gateway.server.to).toHaveBeenCalledWith('lobby');
        expect(toMock.emit).toHaveBeenCalledWith(
          'room:updated',
          mockRoomSnapshot,
        );
      });
    });

    describe(`${ROOM_DELETED_EVENT} → room:deleted`, () => {
      it('ルームと lobby の双方に削除イベントをemitする', () => {
        const toMock = { emit: jest.fn() };
        jest.spyOn(gateway.server, 'to').mockReturnValue(toMock as any);

        eventEmitter.emit(ROOM_DELETED_EVENT, new RoomDeletedEvent('room-1'));

        expect(gateway.server.to).toHaveBeenCalledWith('room-1');
        expect(gateway.server.to).toHaveBeenCalledWith('lobby');
        expect(toMock.emit).toHaveBeenCalledWith('room:deleted', {
          roomId: 'room-1',
        });
      });
    });
  });
});

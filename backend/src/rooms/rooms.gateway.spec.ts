import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitterModule, EventEmitter2 } from '@nestjs/event-emitter';
import { RoomsGateway } from './rooms.gateway';
import { SocketAuthService } from '../websocket/socket-auth.service';
import { SocketPresenceService } from '../websocket/socket-presence.service';
import { RoomsChatService } from './rooms-chat.service';
import { RoomsLobbyService } from './rooms-lobby.service';
import { RoomsService } from './rooms.service';
import { RoomsStateService } from './rooms-state.service';
import type { RoomResponse } from '../common/types/room.type';
import type { Room } from '../common/types/room.type';
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
  let roomsState: jest.Mocked<RoomsStateService>;
  let eventEmitter: EventEmitter2;

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

  const toSnapshot = (room: RoomResponse) => ({
    id: room.id,
    gameId: room.gameId,
    name: room.name,
    hostId: room.hostId,
    hostName: room.hostName,
    players: room.players.map((p) => ({
      userId: p.userId,
      username: p.username,
      avatarUrl: p.avatarUrl,
      isReady: p.isReady,
      isHost: p.isHost,
      joinedAt: p.joinedAt.toISOString(),
    })),
    maxPlayers: room.maxPlayers,
    status: room.status,
    mode: room.mode,
    createdAt: room.createdAt.toISOString(),
    updatedAt: room.updatedAt.toISOString(),
    startedAt: room.startedAt?.toISOString(),
    finishedAt: room.finishedAt?.toISOString(),
  });

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
              (room: RoomResponse) =>
                room.status === 'waiting' && room.mode === 'online',
            ),
            toSnapshot: jest.fn((room: RoomResponse) => toSnapshot(room)),
          },
        },
        {
          provide: RoomsService,
          useValue: {
            leave: jest.fn(),
          },
        },
        {
          provide: RoomsStateService,
          useValue: {
            getRoom: jest.fn(),
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
    roomsState = module.get(RoomsStateService);
    eventEmitter = module.get(EventEmitter2);

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
      client.data.user = { id: 'user-1' };
      gateway.handleRoomJoin(client, { roomId: 'room-1' });
      expect(client.join).toHaveBeenCalledWith('room-1');
      expect(client.data.roomId).toBe('room-1');
      expect(socketPresenceService.register).toHaveBeenCalledWith({
        namespace: 'rooms',
        roomId: 'room-1',
        userId: 'user-1',
        socketId: 'socket-1',
      });
    });

    it('既に別のルームに参加している場合は退出してから新しいルームに参加する', () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      client.data.roomId = 'room-0';
      gateway.handleRoomJoin(client, { roomId: 'room-1' });
      expect(client.leave).toHaveBeenCalledWith('room-0');
      expect(client.join).toHaveBeenCalledWith('room-1');
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
      expect(roomsService.leave).not.toHaveBeenCalled();
      expect(socketPresenceService.scheduleIfInactive).not.toHaveBeenCalled();
    });

    it('同じユーザーの別タブが残っている場合は presence 解除もしない', () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      client.data.roomId = 'room-1';
      socketPresenceService.unregister.mockReturnValue(1);

      gateway.handleRoomLeave(client);

      expect(client.leave).toHaveBeenCalledWith('room-1');
      expect(roomsService.leave).not.toHaveBeenCalled();
      expect(socketPresenceService.scheduleIfInactive).not.toHaveBeenCalled();
    });
  });

  describe('自動退出コールバック(切断からの猶予経過後・ゴーストルーム対策)', () => {
    const getScheduledCallback = () => {
      const call = socketPresenceService.scheduleIfInactive.mock.calls[0];
      return call[2];
    };

    it('猶予時間が過ぎても部屋に参加者として残っていれば leave を呼ぶ', () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      client.data.roomId = 'room-1';
      socketPresenceService.unregister.mockReturnValue(0);

      const remainingRoom: Room = {
        id: 'room-1',
        gameId: 'game-1',
        name: 'test room',
        hostId: 'user-1',
        maxPlayers: 2,
        status: 'WAITING',
        mode: 'ONLINE',
        participants: {
          'user-1': {
            userId: 'user-1',
            username: 'hostuser',
            avatarUrl: null,
            isHost: true,
            isReady: true,
            joinedAt: new Date('2026-07-01T00:00:00.000Z'),
          },
        },
        messages: [],
        invitations: {},
        createdAt: new Date('2026-07-01T00:00:00.000Z'),
        updatedAt: new Date('2026-07-01T00:00:00.000Z'),
      };
      roomsState.getRoom.mockReturnValue(remainingRoom);
      roomsService.leave.mockReturnValue(mockRoomResponse);

      gateway.handleDisconnect(client);
      void getScheduledCallback()();

      // ブロードキャスト自体は RoomsService が発行するドメインイベント経由で行われる
      // (rooms.service.spec.ts、および本ファイルの「ドメインイベント → ブロードキャスト」で検証)
      expect(roomsService.leave).toHaveBeenCalledWith('room-1', 'user-1');
    });

    it('ルームが既に削除されていれば何もしない', () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      client.data.roomId = 'room-1';
      socketPresenceService.unregister.mockReturnValue(0);
      roomsState.getRoom.mockReturnValue(undefined);

      gateway.handleDisconnect(client);
      void getScheduledCallback()();

      expect(roomsService.leave).not.toHaveBeenCalled();
    });

    it('既に本人が参加者から外れていれば何もしない(明示的な room:leave 済みのケース)', () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      client.data.roomId = 'room-1';
      socketPresenceService.unregister.mockReturnValue(0);

      const emptyRoom: Room = {
        id: 'room-1',
        gameId: 'game-1',
        name: 'test room',
        hostId: 'user-2',
        maxPlayers: 2,
        status: 'WAITING',
        mode: 'ONLINE',
        participants: {},
        messages: [],
        invitations: {},
        createdAt: new Date('2026-07-01T00:00:00.000Z'),
        updatedAt: new Date('2026-07-01T00:00:00.000Z'),
      };
      roomsState.getRoom.mockReturnValue(emptyRoom);

      gateway.handleDisconnect(client);
      void getScheduledCallback()();

      expect(roomsService.leave).not.toHaveBeenCalled();
    });
  });

  describe('lobby:join / lobby:leave', () => {
    it('lobby ルームに参加し、現在のロビー一覧を送信する', () => {
      const client = createMockSocket();
      roomsLobbyService.getLobbyRooms.mockReturnValue([mockRoomResponse]);

      gateway.handleLobbyJoin(client);

      expect(client.join).toHaveBeenCalledWith('lobby');
      expect(client.emit).toHaveBeenCalledWith('lobby:rooms', [
        toSnapshot(mockRoomResponse),
      ]);
    });

    it('lobby ルームから退出する', () => {
      const client = createMockSocket();
      gateway.handleLobbyLeave(client);
      expect(client.leave).toHaveBeenCalledWith('lobby');
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

  describe('ドメインイベント → ブロードキャスト', () => {
    describe(`${ROOM_CREATED_EVENT} → room:created`, () => {
      it('online かつ waiting のルームは lobby へ配信する', () => {
        const toMock = { emit: jest.fn() };
        jest.spyOn(gateway.server, 'to').mockReturnValue(toMock as any);

        eventEmitter.emit(
          ROOM_CREATED_EVENT,
          new RoomCreatedEvent(mockRoomResponse),
        );

        expect(gateway.server.to).toHaveBeenCalledWith('lobby');
        expect(toMock.emit).toHaveBeenCalledWith(
          'room:created',
          toSnapshot(mockRoomResponse),
        );
      });

      it('ロビーに表示すべきでないルーム(local_cpu 等)は配信しない', () => {
        const toMock = { emit: jest.fn() };
        jest.spyOn(gateway.server, 'to').mockReturnValue(toMock as any);
        roomsLobbyService.isLobbyVisible.mockReturnValueOnce(false);

        eventEmitter.emit(
          ROOM_CREATED_EVENT,
          new RoomCreatedEvent({ ...mockRoomResponse, mode: 'local_cpu' }),
        );

        expect(toMock.emit).not.toHaveBeenCalled();
      });
    });

    describe(`${ROOM_UPDATED_EVENT} → room:updated`, () => {
      it('RoomResponseからRoomSnapshotを生成し、ルームとロビー双方にemitする(online)', () => {
        const toMock = { emit: jest.fn() };
        jest.spyOn(gateway.server, 'to').mockReturnValue(toMock as any);

        eventEmitter.emit(
          ROOM_UPDATED_EVENT,
          new RoomUpdatedEvent(mockRoomResponse),
        );

        expect(gateway.server.to).toHaveBeenCalledWith('room-1');
        expect(gateway.server.to).toHaveBeenCalledWith('lobby');
        expect(toMock.emit).toHaveBeenCalledWith(
          'room:updated',
          toSnapshot(mockRoomResponse),
        );
      });

      it('local_cpu ルームは lobby へは配信しない', () => {
        const toMock = { emit: jest.fn() };
        jest.spyOn(gateway.server, 'to').mockReturnValue(toMock as any);

        eventEmitter.emit(
          ROOM_UPDATED_EVENT,
          new RoomUpdatedEvent({ ...mockRoomResponse, mode: 'local_cpu' }),
        );

        expect(gateway.server.to).toHaveBeenCalledWith('room-1');
        expect(gateway.server.to).not.toHaveBeenCalledWith('lobby');
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

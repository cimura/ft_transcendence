import { Test, TestingModule } from '@nestjs/testing';
import { WsException } from '@nestjs/websockets';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { SocketAuthService } from '../websocket/socket-auth.service';
import { SocketPresenceService } from '../websocket/socket-presence.service';
import { RoomsStateService } from '../rooms/rooms-state.service';

describe('GameGateway', () => {
  let gateway: GameGateway;
  let gameService: jest.Mocked<GameService>;
  let socketAuthService: jest.Mocked<SocketAuthService>;
  let socketPresenceService: SocketPresenceService;
  let roomsStateService: jest.Mocked<RoomsStateService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameGateway,
        {
          provide: GameService,
          useValue: {
            setServer: jest.fn(),
            handleGameJoin: jest.fn(),
            handleGameStart: jest.fn(),
            handleGameLeave: jest.fn(),
            handlePlayerInput: jest.fn(),
            handleBombPlace: jest.fn(),
          },
        },
        {
          provide: RoomsStateService,
          useValue: {
            getRoom: jest.fn(),
            addRoom: jest.fn(),
            deleteRoom: jest.fn(),
          },
        },
        { provide: SocketAuthService, useValue: { authenticate: jest.fn() } },
        SocketPresenceService,
      ],
    }).compile();

    gateway = module.get<GameGateway>(GameGateway);
    gameService = module.get(GameService);
    socketAuthService = module.get(SocketAuthService);
    socketPresenceService = module.get(SocketPresenceService);
    roomsStateService = module.get(RoomsStateService);
  });

  const createMockSocket = (): any => ({
    id: 'socket-123',
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
    it('正常なトークンで接続された場合、デコードされたuser情報をセットする', () => {
      const client = createMockSocket();
      socketAuthService.authenticate.mockReturnValue({ id: 'user-1' });

      gateway.handleConnection(client);

      expect(client.data.user).toEqual({ id: 'user-1' });
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('トークンが存在しない場合、通信を切断する', () => {
      const client = createMockSocket();
      socketAuthService.authenticate.mockReturnValue(null);
      gateway.handleConnection(client);
      expect(client.disconnect).toHaveBeenCalled();
    });

    it('トークンの形式がBearerでない場合、通信を切断する', () => {
      const client = createMockSocket();
      socketAuthService.authenticate.mockReturnValue(null);
      gateway.handleConnection(client);
      expect(client.disconnect).toHaveBeenCalled();
    });

    it('トークンの検証に失敗した場合、通信を切断する', () => {
      const client = createMockSocket();
      socketAuthService.authenticate.mockReturnValue(null);

      gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleJoin', () => {
    beforeEach(() => {
      // Fast-failのチェックを通過させるため、ダミーのルーム情報を返すようにモック

      roomsStateService.getRoom.mockReturnValue({} as any);
    });

    it('正常にルームに参加できること', async () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      const joinData = { roomId: 'room-1' };
      const initData = { phase: 'waiting' };

      gameService.handleGameJoin.mockReturnValue(initData as any);

      await gateway.handleJoin(joinData, client);

      expect(gameService.handleGameJoin).toHaveBeenCalledWith(
        'room-1',
        'user-1',
        'socket-123',
      );
      expect(client.join).toHaveBeenCalledWith('room-1');
      expect(client.data.roomId).toBe('room-1');
      expect(client.emit).toHaveBeenCalledWith('game:init', initData);
      expect(gameService.handleGameStart).toHaveBeenCalledWith('room-1');
    });

    it('以前のルームがある場合、退出(leave)してから参加すること', async () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      client.data.roomId = 'room-old';
      const joinData = { roomId: 'room-new' };

      await gateway.handleJoin(joinData, client);

      expect(client.leave).toHaveBeenCalledWith('room-old');
      expect(gameService.handleGameLeave).toHaveBeenCalledWith(
        'room-old',
        'user-1',
        'socket-123',
      );
      expect(client.join).toHaveBeenCalledWith('room-new');
      expect(client.data.roomId).toBe('room-new');
    });

    it('参加処理(handleGameJoin)がエラーを投げた場合、例外をスローし以降の処理を行わないこと（例外フィルターに委譲）', async () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      const joinData = { roomId: 'room-1' };

      gameService.handleGameJoin.mockImplementation(() => {
        throw new Error('Room is full');
      });

      await expect(gateway.handleJoin(joinData, client)).rejects.toThrow(
        'Room is full',
      );

      expect(client.join).not.toHaveBeenCalled();
      expect(client.data.roomId).toBeUndefined();
      expect(client.emit).not.toHaveBeenCalled();
      expect(gameService.handleGameStart).not.toHaveBeenCalled();
    });

    it('client.join が失敗した場合、WsExceptionをスローし、roomIdが更新されないこと', async () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      const joinData = { roomId: 'room-1' };
      const initData = { phase: 'waiting' };

      gameService.handleGameJoin.mockReturnValue(initData as any);
      client.join.mockRejectedValue(new Error('Socket join failed'));

      await expect(gateway.handleJoin(joinData, client)).rejects.toThrow(
        WsException,
      );
      await expect(gateway.handleJoin(joinData, client)).rejects.toThrow(
        'Socket join failed',
      );

      expect(client.data.roomId).toBeUndefined();
      expect(client.emit).not.toHaveBeenCalled();
      expect(gameService.handleGameStart).not.toHaveBeenCalled();
    });

    it('client.data.userが存在しない場合、処理を中断すること', async () => {
      const client = createMockSocket();
      const joinData = { roomId: 'room-1' };

      await gateway.handleJoin(joinData, client);

      expect(gameService.handleGameJoin).not.toHaveBeenCalled();
    });
  });

  describe('handleLeave', () => {
    it('ルームから退出すること', async () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      client.data.roomId = 'room-1';
      socketPresenceService.register({
        namespace: 'game',
        roomId: 'room-1',
        userId: 'user-1',
        socketId: 'socket-123',
      });

      await gateway.handleLeave(client);

      expect(client.leave).toHaveBeenCalledWith('room-1');
      expect(client.data.roomId).toBeUndefined();
      expect(gameService.handleGameLeave).toHaveBeenCalledWith(
        'room-1',
        'user-1',
        'socket-123',
      );
    });

    it('ルームに参加していない場合は何もしないこと', async () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };

      await gateway.handleLeave(client);

      expect(client.leave).not.toHaveBeenCalled();
      expect(gameService.handleGameLeave).not.toHaveBeenCalled();
    });
  });

  describe('handleInput', () => {
    it('入力を正しくGameServiceへ渡すこと', () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      client.data.roomId = 'room-1';
      socketPresenceService.register({
        namespace: 'game',
        roomId: 'room-1',
        userId: 'user-1',
        socketId: 'socket-123',
      });

      const inputData = { direction: 'up' as const, seq: 1 };

      gateway.handleInput(inputData, client);

      expect(gameService.handlePlayerInput).toHaveBeenCalledWith(
        'room-1',
        'user-1',
        'up',
        1,
      );
    });

    it('roomIdがない場合は処理しないこと', () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      const inputData = { direction: 'up' as const, seq: 1 };

      gateway.handleInput(inputData, client);
      expect(gameService.handlePlayerInput).not.toHaveBeenCalled();
    });
  });

  describe('handleBombPlace', () => {
    it('爆弾設置リクエストを正しくGameServiceへ渡すこと', () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      client.data.roomId = 'room-1';

      gateway.handleBombPlace({ seq: 1 }, client);

      expect(gameService.handleBombPlace).toHaveBeenCalledWith(
        'room-1',
        'user-1',
      );
    });
  });

  describe('handleDisconnect', () => {
    it('切断猶予期間が経過するとgameService.handleGameLeaveが呼ばれること', async () => {
      jest.useFakeTimers();
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      client.data.roomId = 'room-1';
      socketPresenceService.register({
        namespace: 'game',
        roomId: 'room-1',
        userId: 'user-1',
        socketId: 'socket-123',
      });

      gateway.handleDisconnect(client);
      await jest.advanceTimersByTimeAsync(2000);

      expect(gameService.handleGameLeave).toHaveBeenCalledWith(
        'room-1',
        'user-1',
        'socket-123',
      );
      jest.useRealTimers();
    });

    it('ユーザー情報がない場合、何もしないこと', () => {
      const client = createMockSocket();

      gateway.handleDisconnect(client);

      expect(gameService.handleGameLeave).not.toHaveBeenCalled();
    });
  });
});

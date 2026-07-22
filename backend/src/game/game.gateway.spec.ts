import { Test, TestingModule } from '@nestjs/testing';
import { WsException } from '@nestjs/websockets';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { SocketAuthService } from '../websocket/socket-auth.service';
import { SocketPresenceService } from '../websocket/socket-presence.service';

describe('GameGateway', () => {
  let gateway: GameGateway;
  let gameService: jest.Mocked<GameService>;
  let socketAuthService: jest.Mocked<SocketAuthService>;
  let socketPresenceService: SocketPresenceService;

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
        { provide: SocketAuthService, useValue: { authenticate: jest.fn() } },
        SocketPresenceService,
      ],
    }).compile();

    gateway = module.get<GameGateway>(GameGateway);
    gameService = module.get(GameService);
    socketAuthService = module.get(SocketAuthService);
    socketPresenceService = module.get(SocketPresenceService);
  });

  // モックのソケットオブジェクトを作成するヘルパー関数
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
    it('正常にルームに参加できること', async () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      const joinData = { roomId: 'room-1' };
      const initData = { phase: 'waiting' }; // モック用のダミーデータ

      gameService.handleGameJoin.mockReturnValue(initData as any);

      await gateway.handleJoin(joinData, client);

      // handleGameJoin に clientId を渡しているか確認
      expect(gameService.handleGameJoin).toHaveBeenCalledWith(
        'room-1',
        'user-1',
        'socket-123',
      );
      expect(client.join).toHaveBeenCalledWith('room-1');

      // ルームへの参加成功後に roomId が設定されているか
      expect(client.data.roomId).toBe('room-1');

      // クライアントへ初期化データを送っているか
      expect(client.emit).toHaveBeenCalledWith('game:init', initData);

      // ゲーム開始条件のチェック処理が走っているか
      expect(gameService.handleGameStart).toHaveBeenCalledWith('room-1');
    });

    it('以前のルームがある場合、退出(leave)してから参加すること', async () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      client.data.roomId = 'room-old';
      const joinData = { roomId: 'room-new' };

      await gateway.handleJoin(joinData, client);

      // 旧ルームからの退出処理が呼ばれているか確認
      expect(client.leave).toHaveBeenCalledWith('room-old');
      expect(gameService.handleGameLeave).toHaveBeenCalledWith(
        'room-old',
        'user-1',
        'socket-123',
      );

      // 新ルームへ参加しているか
      expect(client.join).toHaveBeenCalledWith('room-new');
      expect(client.data.roomId).toBe('room-new');
    });

    it('参加処理(handleGameJoin)がエラーを投げた場合、例外をスローし以降の処理を行わないこと（例外フィルターに委譲）', async () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      const joinData = { roomId: 'room-1' };

      // Serviceがエラーを投げる挙動をモック
      gameService.handleGameJoin.mockImplementation(() => {
        throw new Error('Room is full');
      });

      // 例外がそのままスローされることを検証
      await expect(gateway.handleJoin(joinData, client)).rejects.toThrow(
        'Room is full',
      );

      // 後続の処理が呼ばれていないこと（エラーハンドリングはFilterが担うため）
      expect(client.join).not.toHaveBeenCalled();
      expect(client.data.roomId).toBeUndefined(); // roomIdが更新されていないこと
      expect(client.emit).not.toHaveBeenCalled();
      expect(gameService.handleGameStart).not.toHaveBeenCalled();
    });

    it('client.join が失敗した場合、WsExceptionをスローし、roomIdが更新されないこと', async () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      const joinData = { roomId: 'room-1' };
      const initData = { phase: 'waiting' };

      gameService.handleGameJoin.mockReturnValue(initData as any);
      // joinが失敗する挙動をモック
      client.join.mockRejectedValue(new Error('Socket join failed'));

      // WsException に変換されてスローされることを検証
      await expect(gateway.handleJoin(joinData, client)).rejects.toThrow(
        WsException,
      );
      await expect(gateway.handleJoin(joinData, client)).rejects.toThrow(
        'Socket join failed',
      );

      // 失敗した場合は client.data.roomId に値が代入されていないこと（不整合防止）
      expect(client.data.roomId).toBeUndefined();

      // 後続の処理が呼ばれていないこと
      expect(client.emit).not.toHaveBeenCalled();
      expect(gameService.handleGameStart).not.toHaveBeenCalled();
    });

    it('client.data.userが存在しない場合、処理を中断すること', async () => {
      const client = createMockSocket(); // userを設定しない
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

      // userId と clientId を渡しているか
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
      client.data.user = { id: 'user-1' }; // roomIdを設定しない
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

      // userId と clientId を渡しているか
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

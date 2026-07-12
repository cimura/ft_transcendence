import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';

describe('GameGateway', () => {
  let gateway: GameGateway;
  let gameService: jest.Mocked<GameService>;
  let jwtService: jest.Mocked<JwtService>;

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
          provide: JwtService,
          useValue: {
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<GameGateway>(GameGateway);
    gameService = module.get(GameService);
    jwtService = module.get(JwtService);
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
      client.handshake.auth.token = 'Bearer valid-token';
      jwtService.verify.mockReturnValue({ sub: 'user-1' });

      gateway.handleConnection(client);

      expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
      expect(client.data.user).toEqual({ id: 'user-1' });
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('トークンが存在しない場合、通信を切断する', () => {
      const client = createMockSocket();
      gateway.handleConnection(client);
      expect(client.disconnect).toHaveBeenCalled();
    });

    it('トークンの形式がBearerでない場合、通信を切断する', () => {
      const client = createMockSocket();
      client.handshake.auth.token = 'Invalid format token';
      gateway.handleConnection(client);
      expect(client.disconnect).toHaveBeenCalled();
    });

    it('トークンの検証に失敗した場合、通信を切断する', () => {
      const client = createMockSocket();
      client.handshake.auth.token = 'Bearer invalid-token';
      jwtService.verify.mockImplementation(() => {
        throw new Error('JWT verify error');
      });

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
        'user-1',
        'socket-123',
      );

      // 新ルームへ参加しているか
      expect(client.join).toHaveBeenCalledWith('room-new');
      expect(client.data.roomId).toBe('room-new');
    });

    it('参加処理(handleGameJoin)がエラーを投げた場合、game:error をemitすること', async () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      const joinData = { roomId: 'room-1' };

      gameService.handleGameJoin.mockImplementation(() => {
        throw new Error('Room is full');
      });

      await gateway.handleJoin(joinData, client);

      // エラーイベントがクライアントに通知されているか
      expect(client.emit).toHaveBeenCalledWith('game:error', {
        message: 'Room is full',
      });
      expect(client.join).not.toHaveBeenCalled();
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

      await gateway.handleLeave(client);

      expect(client.leave).toHaveBeenCalledWith('room-1');
      expect(client.data.roomId).toBeUndefined();

      // userId と clientId を渡しているか
      expect(gameService.handleGameLeave).toHaveBeenCalledWith(
        'user-1',
        'socket-123',
      );
    });

    it('ルームに参加していなくても、gameService.handleGameLeaveが呼ばれること', async () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      // client.data.roomId は設定しない

      await gateway.handleLeave(client);

      expect(client.leave).not.toHaveBeenCalled();
      expect(gameService.handleGameLeave).toHaveBeenCalledWith(
        'user-1',
        'socket-123',
      );
    });
  });

  describe('handleInput', () => {
    it('入力を正しくGameServiceへ渡すこと', () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      client.data.roomId = 'room-1';

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
    it('切断時にgameService.handleGameLeaveが呼ばれること', () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };

      gateway.handleDisconnect(client);

      // userId と clientId を渡しているか
      expect(gameService.handleGameLeave).toHaveBeenCalledWith(
        'user-1',
        'socket-123',
      );
    });

    it('ユーザー情報がない場合、何もしないこと', () => {
      const client = createMockSocket();

      gateway.handleDisconnect(client);

      expect(gameService.handleGameLeave).not.toHaveBeenCalled();
    });
  });
});

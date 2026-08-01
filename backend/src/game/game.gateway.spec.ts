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
            handleGameRetire: jest.fn(),
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
  const createMockSocket = (id = 'socket-123'): any => ({
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

      expect(gameService.handleGameJoin).toHaveBeenCalledWith(
        'room-1',
        'user-1',
      );
      expect(client.join).toHaveBeenCalledWith('room-1');

      // ルームへの参加成功後に roomId が設定されているか
      expect(client.data.roomId).toBe('room-1');

      // クライアントへ初期化データを送っているか
      expect(client.emit).toHaveBeenCalledWith('game:init', initData);

      // ゲーム開始条件のチェック処理が走っているか
      expect(gameService.handleGameStart).toHaveBeenCalledWith('room-1');
    });

    it('以前のルームがある場合、新ルームへの参加後に退出すること', async () => {
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
      );

      // 新ルームへ参加しているか
      expect(client.join).toHaveBeenCalledWith('room-new');
      expect(client.data.roomId).toBe('room-new');
    });

    it('参加処理(handleGameJoin)がエラーを投げた場合、Socket.IOルームへの参加をロールバックすること', async () => {
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

      // Socket.IOルームへの参加がロールバックされること
      expect(client.join).toHaveBeenCalledWith('room-1');
      expect(client.leave).toHaveBeenCalledWith('room-1');
      expect(client.data.roomId).toBeUndefined(); // roomIdが更新されていないこと
      expect(client.emit).not.toHaveBeenCalled();
      expect(gameService.handleGameStart).not.toHaveBeenCalled();
    });

    it('client.join が失敗した場合、新旧ルームのゲーム状態を変更しないこと', async () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      client.data.roomId = 'room-old';
      const joinData = { roomId: 'room-1' };

      // joinが失敗する挙動をモック
      client.join.mockRejectedValue(new Error('Socket join failed'));

      // WsException に変換されてスローされることを検証
      await expect(gateway.handleJoin(joinData, client)).rejects.toThrow(
        WsException,
      );
      await expect(gateway.handleJoin(joinData, client)).rejects.toThrow(
        'ルームに参加できません。',
      );

      // 新旧ルームのゲーム状態と現在のroomIdが変更されていないこと
      expect(gameService.handleGameJoin).not.toHaveBeenCalled();
      expect(gameService.handleGameLeave).not.toHaveBeenCalled();
      expect(client.leave).not.toHaveBeenCalled();
      expect(client.data.roomId).toBe('room-old');

      // 後続の処理が呼ばれていないこと
      expect(client.emit).not.toHaveBeenCalled();
      expect(gameService.handleGameJoin).not.toHaveBeenCalled();
      expect(gameService.handleGameStart).not.toHaveBeenCalled();
    });

    it('同じルームへの再参加処理が失敗した場合、既存のルームから退出しないこと', async () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      client.data.roomId = 'room-1';

      gameService.handleGameJoin.mockImplementation(() => {
        throw new Error('Cannot rejoin the room');
      });

      await expect(
        gateway.handleJoin({ roomId: 'room-1' }, client),
      ).rejects.toThrow('Cannot rejoin the room');

      expect(client.join).toHaveBeenCalledWith('room-1');
      expect(client.leave).not.toHaveBeenCalled();
      expect(client.data.roomId).toBe('room-1');
    });

    it('旧ルームからの退出に失敗した場合、新ルームを巻き戻して旧ルームを復元すること', async () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      client.data.roomId = 'room-old';
      gameService.handleGameJoin.mockReturnValue({ phase: 'waiting' } as any);
      client.leave.mockImplementation((roomId: string) => {
        if (roomId === 'room-old') {
          return Promise.reject(new Error('Old room leave failed'));
        }
        return Promise.resolve();
      });

      await expect(
        gateway.handleJoin({ roomId: 'room-new' }, client),
      ).rejects.toThrow('Old room leave failed');

      expect(client.leave).toHaveBeenNthCalledWith(1, 'room-old');
      expect(client.leave).toHaveBeenNthCalledWith(2, 'room-new');
      expect(gameService.handleGameLeave).toHaveBeenCalledWith(
        'room-old',
        'user-1',
      );
      expect(gameService.handleGameLeave).toHaveBeenCalledWith(
        'room-new',
        'user-1',
      );
      expect(gameService.handleGameJoin).toHaveBeenLastCalledWith(
        'room-old',
        'user-1',
      );
      expect(client.data.roomId).toBe('room-old');
    });

    it('参加失敗時のSocket room rollbackも失敗しても元の参加エラーを維持すること', async () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };
      client.join.mockResolvedValue(undefined);
      client.leave.mockRejectedValue(new Error('Rollback leave failed'));
      gameService.handleGameJoin.mockImplementation(() => {
        throw new Error('Game join failed');
      });

      await expect(
        gateway.handleJoin({ roomId: 'room-new' }, client),
      ).rejects.toThrow('Game join failed');

      expect(client.join).toHaveBeenCalledWith('room-new');
      expect(client.leave).toHaveBeenCalledWith('room-new');
      expect(client.data.roomId).toBeUndefined();
    });

    it('client.data.userが存在しない場合、処理を中断すること', async () => {
      const client = createMockSocket(); // userを設定しない
      const joinData = { roomId: 'room-1' };

      await gateway.handleJoin(joinData, client);

      expect(gameService.handleGameJoin).not.toHaveBeenCalled();
    });
  });

  describe('handleLeave', () => {
    it('ルームから退出し、リタイア扱いとしてhandleGameRetireが呼ばれること', async () => {
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

      expect(gameService.handleGameRetire).toHaveBeenCalledWith(
        'room-1',
        'user-1',
      );
      expect(gameService.handleGameLeave).not.toHaveBeenCalled();
    });

    it('リタイア処理がSocket.IOルーム退出より前に、同期的に呼ばれること', async () => {
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

      // 後続のawaitでtickループが進んでしまう前にリタイアが反映されていること
      const retireOrder =
        gameService.handleGameRetire.mock.invocationCallOrder[0];
      const leaveOrder = (client.leave as jest.Mock).mock
        .invocationCallOrder[0];
      expect(retireOrder).toBeLessThan(leaveOrder);
    });

    it('同一ユーザーの別ソケットが残っている場合はリタイア扱いにしないこと(複数タブ対策)', async () => {
      const clientA = createMockSocket('socket-a');
      clientA.data.user = { id: 'user-1' };
      clientA.data.roomId = 'room-1';
      const clientB = createMockSocket('socket-b');
      clientB.data.user = { id: 'user-1' };
      clientB.data.roomId = 'room-1';

      socketPresenceService.register({
        namespace: 'game',
        roomId: 'room-1',
        userId: 'user-1',
        socketId: 'socket-a',
      });
      socketPresenceService.register({
        namespace: 'game',
        roomId: 'room-1',
        userId: 'user-1',
        socketId: 'socket-b',
      });

      // 1本目のタブで明示的に離脱しても、2本目がまだ残っているためリタイアさせない
      await gateway.handleLeave(clientA);
      expect(gameService.handleGameRetire).not.toHaveBeenCalled();
      expect(gameService.handleGameLeave).not.toHaveBeenCalled();

      // 最後の1本が明示的に離脱すると、リタイア扱いになる
      await gateway.handleLeave(clientB);
      expect(gameService.handleGameRetire).toHaveBeenCalledWith(
        'room-1',
        'user-1',
      );
    });

    it('ルームに参加していない場合は何もしないこと', async () => {
      const client = createMockSocket();
      client.data.user = { id: 'user-1' };

      await gateway.handleLeave(client);

      expect(client.leave).not.toHaveBeenCalled();
      expect(gameService.handleGameLeave).not.toHaveBeenCalled();
      expect(gameService.handleGameRetire).not.toHaveBeenCalled();
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
    it('唯一のソケットが切断するとgameService.handleGameLeaveが呼ばれること', () => {
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

      expect(gameService.handleGameLeave).toHaveBeenCalledWith(
        'room-1',
        'user-1',
      );
      // 意図しない切断はリタイア扱いにせず、猶予付きの通常切断処理に委ねること
      expect(gameService.handleGameRetire).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('同一ユーザーの別ソケットが残っている場合は切断扱いにしないこと(StrictMode/複数タブ対策)', () => {
      // React StrictMode の二重ソケットや別タブ接続を想定し、同一ユーザーの
      // 2本のソケットを presence に登録する
      const clientA = createMockSocket('socket-a');
      clientA.data.user = { id: 'user-1' };
      clientA.data.roomId = 'room-1';
      const clientB = createMockSocket('socket-b');
      clientB.data.user = { id: 'user-1' };
      clientB.data.roomId = 'room-1';

      socketPresenceService.register({
        namespace: 'game',
        roomId: 'room-1',
        userId: 'user-1',
        socketId: 'socket-a',
      });
      socketPresenceService.register({
        namespace: 'game',
        roomId: 'room-1',
        userId: 'user-1',
        socketId: 'socket-b',
      });

      // 1本目が切断しても、まだ2本目が残っているため handleGameLeave は呼ばれない
      gateway.handleDisconnect(clientA);
      expect(gameService.handleGameLeave).not.toHaveBeenCalled();

      // 最後の1本が切断すると呼ばれる。これは最新ソケットが先に閉じても
      // 最終的に切断扱いになることの確認でもある
      gateway.handleDisconnect(clientB);
      expect(gameService.handleGameLeave).toHaveBeenCalledWith(
        'room-1',
        'user-1',
      );
    });

    it('ユーザー情報がない場合、何もしないこと', () => {
      const client = createMockSocket();

      gateway.handleDisconnect(client);

      expect(gameService.handleGameLeave).not.toHaveBeenCalled();
    });
  });
});

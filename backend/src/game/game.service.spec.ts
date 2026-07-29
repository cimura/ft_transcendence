import { Test, TestingModule } from '@nestjs/testing';
import { WsException } from '@nestjs/websockets';
import type { Server } from 'socket.io';
import { GameService } from './game.service';
import {
  GAME_COUNTDOWN_SEC,
  GAME_TICK_RATE,
  DISCONNECT_TIMEOUT_MS,
} from './constants/game-constants';
import { ScoresService } from '../scores/scores.service';
import { RoomsStateService } from '../rooms/rooms-state.service';
import type { Room } from '../common/types/room.type';

describe('GameService', () => {
  let service: GameService;
  let roomsState: RoomsStateService;
  let emit: jest.Mock;
  let to: jest.Mock;
  let scoresService: { recordMatchResult: jest.Mock };

  beforeEach(async () => {
    jest.useFakeTimers();
    emit = jest.fn();
    to = jest.fn().mockReturnValue({ emit });
    scoresService = {
      recordMatchResult: jest.fn().mockResolvedValue(undefined),
    };
    roomsState = new RoomsStateService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        { provide: ScoresService, useValue: scoresService },
        { provide: RoomsStateService, useValue: roomsState },
      ],
    }).compile();

    service = module.get<GameService>(GameService);
    service.setServer({
      to,
    } as unknown as Server);

    // テスト用のルームを事前にメモリにセットアップ
    const testRoom: Room = {
      id: 'room-1',
      gameId: 'bomberman',
      name: 'Test Room',
      hostId: 'player-1',
      maxPlayers: 2,
      status: 'WAITING',
      mode: 'ONLINE',
      participants: {
        'player-1': {
          userId: 'player-1',
          username: 'p1',
          avatarUrl: null,
          isHost: true,
          isReady: true,
          joinedAt: new Date(),
        },
        'player-2': {
          userId: 'player-2',
          username: 'p2',
          avatarUrl: null,
          isHost: false,
          isReady: true,
          joinedAt: new Date(),
        },
      },
      messages: [],
      invitations: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    roomsState.addRoom(testRoom);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Connection & Setup', () => {
    it('参加が許可され、初期データが返ること', () => {
      const initData = service.handleGameJoin('room-1', 'player-1', 'client-1');

      expect(initData.yourId).toBe('player-1');
      expect(initData.phase).toBe('waiting');
      expect(initData.players['player-1']).toBeDefined();
    });

    it('異なるクライアントからのゴーストソケットの切断イベントを無視すること', () => {
      service.handleGameJoin('room-1', 'player-1', 'client-1');

      // ゴーストソケットからの切断通知
      service.handleGameLeave('room-1', 'player-1', 'client-old');

      // 部屋から退出させられていないか確認するため、2人目を追加してゲームを開始してみる
      service.handleGameJoin('room-1', 'player-2', 'client-2');
      service.handleGameStart('room-1');

      // player-1 が残っていれば 2人揃っている判定になりカウントダウンが始まる
      expect(emit).toHaveBeenCalledWith('game:countdown', expect.any(Object));
    });

    it('待機中に同一プレイヤーが多重 join しても失敗せず、最新のソケットに接続先が更新されること', () => {
      service.handleGameJoin('room-1', 'player-1', 'client-1');

      // React StrictMode 等による多重 join を想定 (まだ切断イベントは来ていない)
      expect(() => {
        service.handleGameJoin('room-1', 'player-1', 'client-1-new');
      }).not.toThrow();

      // 古いソケットからの切断は無視され、ゲームは開始できる
      service.handleGameLeave('room-1', 'player-1', 'client-1');
      service.handleGameJoin('room-1', 'player-2', 'client-2');
      service.handleGameStart('room-1');

      expect(emit).toHaveBeenCalledWith('game:countdown', expect.any(Object));
    });

    it('最後の参加者によるカウントダウン開始直後の多重 join を許可すること', () => {
      service.handleGameJoin('room-1', 'player-1', 'client-1');
      service.handleGameJoin('room-1', 'player-2', 'client-2');
      service.handleGameStart('room-1');

      expect(() => {
        service.handleGameJoin('room-1', 'player-2', 'client-2-new');
      }).not.toThrow();

      // 置き換え前のソケットが遅れて切断してもプレイヤーを切断扱いにしない
      service.handleGameLeave('room-1', 'player-2', 'client-2');
      const session = roomsState.getRoom('room-1')?.gameSession;
      expect(session?.players['player-2'].isDisconnected).toBe(false);
    });
  });

  describe('Game Lifecycle & Disconnection', () => {
    beforeEach(() => {
      service.handleGameJoin('room-1', 'player-1', 'client-1');
      service.handleGameStart('room-1');
      service.handleGameJoin('room-1', 'player-2', 'client-2');
      service.handleGameStart('room-1');
    });

    it('人数が揃うとカウントダウンが始まり、その後playingへ移行すること', () => {
      expect(emit).toHaveBeenCalledWith(
        'game:countdown',
        expect.objectContaining({ seconds: GAME_COUNTDOWN_SEC }),
      );

      jest.advanceTimersByTime(GAME_COUNTDOWN_SEC * 1000);

      expect(emit).toHaveBeenCalledWith('game:playing');
      jest.advanceTimersByTime(1000 / GAME_TICK_RATE);
      expect(emit).toHaveBeenCalledWith('game:state', expect.any(Object));
    });

    it('プレイ中に切断されても即座には終了せず、猶予時間後にタイムアウト負けになること', () => {
      jest.advanceTimersByTime(GAME_COUNTDOWN_SEC * 1000);

      // player-1 が切断
      service.handleGameLeave('room-1', 'player-1', 'client-1');

      // まだゲームは終わらない
      jest.advanceTimersByTime(10000);
      expect(emit).not.toHaveBeenCalledWith('game:end', expect.any(Object));

      // タイムアウト時間経過後、自爆判定が行われる
      jest.advanceTimersByTime(DISCONNECT_TIMEOUT_MS - 10000 + 1000);

      expect(emit).toHaveBeenCalledWith(
        'game:end',
        expect.objectContaining({
          winnerId: 'player-2',
        }),
      );
    });

    it('猶予時間内に再接続（Join）すればゲームに復帰できること', () => {
      jest.advanceTimersByTime(GAME_COUNTDOWN_SEC * 1000);

      service.handleGameLeave('room-1', 'player-1', 'client-1');

      // 10秒後に新しいソケットIDで復帰
      jest.advanceTimersByTime(10000);
      const initData = service.handleGameJoin(
        'room-1',
        'player-1',
        'client-1-new',
      );

      expect(initData.phase).toBe('playing');

      jest.advanceTimersByTime(DISCONNECT_TIMEOUT_MS);
      expect(emit).not.toHaveBeenCalledWith('game:end', expect.any(Object));
    });

    it('ゲーム中に切断されていないソケットから多重ログインしようとするとエラーになること', () => {
      jest.advanceTimersByTime(GAME_COUNTDOWN_SEC * 1000);

      expect(() => {
        service.handleGameJoin('room-1', 'player-1', 'client-1-new');
      }).toThrow(WsException);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { WsException } from '@nestjs/websockets';
import type { Server } from 'socket.io';
import { GameService } from './game.service';
import {
  GAME_COUNTDOWN_SEC,
  GAME_TICK_RATE,
  DISCONNECT_TIMEOUT_MS,
} from './constants/game-constants';

describe('GameService', () => {
  let service: GameService;
  let emit: jest.Mock;
  let to: jest.Mock;

  beforeEach(async () => {
    jest.useFakeTimers();
    emit = jest.fn();
    to = jest.fn().mockReturnValue({ emit });

    const module: TestingModule = await Test.createTestingModule({
      providers: [GameService],
    }).compile();

    service = module.get<GameService>(GameService);
    service.setServer({
      to,
    } as unknown as Server);
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
      service.handleGameLeave('player-1', 'client-old');

      // 部屋から退出させられていないか確認するため、2人目を追加してゲームを開始してみる
      service.handleGameJoin('room-1', 'player-2', 'client-2');
      service.handleGameStart('room-1');

      // player-1 が残っていれば 2人揃っている判定になりカウントダウンが始まる
      expect(emit).toHaveBeenCalledWith('game:countdown', expect.any(Object));
    });
  });

  describe('Game Lifecycle & Disconnection', () => {
    beforeEach(() => {
      // 2人のプレイヤーを参加させてゲームを開始するヘルパー
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

      // カウントダウンを進める
      jest.advanceTimersByTime(GAME_COUNTDOWN_SEC * 1000);

      expect(emit).toHaveBeenCalledWith('game:playing');

      // ゲームループが動いているか確認
      jest.advanceTimersByTime(1000 / GAME_TICK_RATE);
      expect(emit).toHaveBeenCalledWith('game:state', expect.any(Object));
    });

    it('プレイ中に切断されても即座には終了せず、猶予時間後にタイムアウト負けになること', () => {
      jest.advanceTimersByTime(GAME_COUNTDOWN_SEC * 1000); // プレイ開始

      // player-1 が切断
      service.handleGameLeave('player-1', 'client-1');

      // まだゲームは終わらない
      jest.advanceTimersByTime(10000);
      expect(emit).not.toHaveBeenCalledWith('game:end', expect.any(Object));

      // タイムアウト時間（30秒）経過後、ゲームループのTickで自爆判定が行われる
      jest.advanceTimersByTime(DISCONNECT_TIMEOUT_MS - 10000 + 1000);

      // player-1 が死んだことで player-2 の勝利になる
      expect(emit).toHaveBeenCalledWith(
        'game:end',
        expect.objectContaining({
          winnerId: 'player-2',
        }),
      );
    });

    it('猶予時間内に再接続（Join）すればゲームに復帰できること', () => {
      jest.advanceTimersByTime(GAME_COUNTDOWN_SEC * 1000); // プレイ開始

      // player-1 が切断
      service.handleGameLeave('player-1', 'client-1');

      // 10秒後に新しいソケットIDで復帰
      jest.advanceTimersByTime(10000);
      const initData = service.handleGameJoin(
        'room-1',
        'player-1',
        'client-1-new',
      );

      expect(initData.phase).toBe('playing');

      // そこからさらに30秒経過しても、切断が解除されているためゲームオーバーにならない
      jest.advanceTimersByTime(DISCONNECT_TIMEOUT_MS);
      expect(emit).not.toHaveBeenCalledWith('game:end', expect.any(Object));
    });

    it('ゲーム中に切断されていないソケットから多重ログインしようとするとエラーになること', () => {
      jest.advanceTimersByTime(GAME_COUNTDOWN_SEC * 1000); // プレイ開始

      expect(() => {
        // player-1 はすでに繋がっているのに、別のタブなどから参加しようとする
        service.handleGameJoin('room-1', 'player-1', 'client-1-new');
      }).toThrow(WsException);
    });

    it('全員が切断してタイムアウトした場合、引き分けとして終了すること', () => {
      jest.advanceTimersByTime(GAME_COUNTDOWN_SEC * 1000); // プレイ開始

      // 全員切断
      service.handleGameLeave('player-1', 'client-1');
      service.handleGameLeave('player-2', 'client-2');

      // タイムアウト時間経過
      jest.advanceTimersByTime(DISCONNECT_TIMEOUT_MS + 1000);

      // 全滅のため引き分け（isDraw: true）になる
      expect(emit).toHaveBeenCalledWith(
        'game:end',
        expect.objectContaining({
          isDraw: true,
        }),
      );
    });
  });
});

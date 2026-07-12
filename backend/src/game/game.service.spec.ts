import { Test, TestingModule } from '@nestjs/testing';
import type { Server } from 'socket.io';
import { GameService } from './game.service';
import { GAME_COUNTDOWN_SEC, GAME_TICK_RATE } from './constants/game-constants';
import { ScoresService } from '../scores/scores.service';

describe('GameService', () => {
  let service: GameService;
  let emit: jest.Mock;
  let scoresService: {
    recordMatchResult: jest.Mock;
  };

  beforeEach(async () => {
    jest.useFakeTimers();
    emit = jest.fn();
    scoresService = {
      recordMatchResult: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        {
          provide: ScoresService,
          useValue: scoresService,
        },
      ],
    }).compile();

    service = module.get<GameService>(GameService);
    service.setServer({
      to: jest.fn().mockReturnValue({ emit }),
    } as unknown as Server);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('cancels countdown when a player leaves and the room no longer has enough players', () => {
    service.handleGameJoin('room-1', 'player-1');
    service.handleGameJoin('room-1', 'player-2');

    expect(emit).toHaveBeenCalledWith(
      'game:countdown',
      expect.objectContaining({ seconds: GAME_COUNTDOWN_SEC }),
    );

    emit.mockClear();
    service.handleGameLeave('player-2');

    expect(emit).toHaveBeenCalledWith(
      'game:state',
      expect.objectContaining({
        phase: 'waiting',
        players: expect.objectContaining({
          'player-1': expect.any(Object),
        }),
      }),
    );
    expect(emit).toHaveBeenCalledWith(
      'game:state',
      expect.objectContaining({
        players: expect.not.objectContaining({
          'player-2': expect.any(Object),
        }),
      }),
    );

    const emittedAfterLeave = emit.mock.calls.length;
    jest.advanceTimersByTime(
      GAME_COUNTDOWN_SEC * 1000 + Math.ceil(1000 / GAME_TICK_RATE),
    );

    expect(emit).toHaveBeenCalledTimes(emittedAfterLeave);
  });

  it('starts a new countdown after the start condition is met again', () => {
    service.handleGameJoin('room-1', 'player-1');
    service.handleGameJoin('room-1', 'player-2');
    service.handleGameLeave('player-2');

    emit.mockClear();
    const initData = service.handleGameJoin('room-1', 'player-3');

    expect(initData.phase).toBe('countdown');
    expect(emit).toHaveBeenCalledWith(
      'game:countdown',
      expect.objectContaining({ seconds: GAME_COUNTDOWN_SEC }),
    );
  });

  it('records match history when a playing game ends', async () => {
    service.handleGameJoin('room-1', 'player-1');
    service.handleGameJoin('room-1', 'player-2');

    jest.advanceTimersByTime(GAME_COUNTDOWN_SEC * 1000);
    service.handleGameLeave('player-2');
    await Promise.resolve();

    expect(emit).toHaveBeenCalledWith(
      'game:end',
      expect.objectContaining({
        winnerId: 'player-1',
        isDraw: false,
        rankings: expect.arrayContaining([
          expect.objectContaining({ playerId: 'player-1' }),
          expect.objectContaining({ playerId: 'player-2' }),
        ]),
      }),
    );
    expect(scoresService.recordMatchResult).toHaveBeenCalledWith(
      expect.objectContaining({
        gameType: 'Bomberman',
        winnerId: 'player-1',
        isDraw: false,
        rankings: expect.arrayContaining([
          expect.objectContaining({ playerId: 'player-1' }),
          expect.objectContaining({ playerId: 'player-2' }),
        ]),
      }),
    );
  });
});

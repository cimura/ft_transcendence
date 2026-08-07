import { plainToInstance, type ClassConstructor } from 'class-transformer';
import { validateSync } from 'class-validator';
import { BombPlaceDto, GameJoinDto, PlayerInputDto } from './game-events.dto';

describe('game WebSocket DTOs', () => {
  it('accepts valid game payloads', () => {
    expect(
      validateSync(
        plainToInstance(GameJoinDto, {
          roomId: '2fc6e756-9f31-4fad-85a2-a76afc09612b',
        }),
      ),
    ).toHaveLength(0);
    expect(
      validateSync(
        plainToInstance(PlayerInputDto, { direction: 'left', seq: 1 }),
      ),
    ).toHaveLength(0);
    expect(
      validateSync(plainToInstance(BombPlaceDto, { seq: 1 })),
    ).toHaveLength(0);
  });

  it.each([
    [GameJoinDto, { roomId: '<script>alert(1)</script>' }],
    [PlayerInputDto, { direction: 'diagonal', seq: 1 }],
    [PlayerInputDto, { direction: 'up', seq: -1 }],
    [PlayerInputDto, { direction: 'up', seq: 1.5 }],
    [BombPlaceDto, { seq: '1 OR 1=1' }],
  ])('rejects malformed %p payloads', (Dto, payload) => {
    expect(
      validateSync(
        plainToInstance(Dto as ClassConstructor<object>, payload as object),
      ),
    ).not.toHaveLength(0);
  });
});

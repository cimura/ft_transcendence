import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MatchHistoryQueryDto } from './match-history.dto';

const validateQuery = (query: Record<string, unknown>) =>
  validate(plainToInstance(MatchHistoryQueryDto, query));

describe('MatchHistoryQueryDto', () => {
  it('accepts empty query params so controller defaults can be used', async () => {
    await expect(validateQuery({})).resolves.toHaveLength(0);
  });

  it('accepts page and limit within the allowed range', async () => {
    await expect(
      validateQuery({ page: '1', limit: '20' }),
    ).resolves.toHaveLength(0);
  });

  it('rejects page outside the allowed range', async () => {
    const errors = await validateQuery({ page: '0', limit: '20' });

    expect(errors).toEqual([
      expect.objectContaining({
        property: 'page',
        constraints: expect.objectContaining({
          min: expect.any(String),
        }),
      }),
    ]);
  });

  it('rejects limit outside the allowed range', async () => {
    const errors = await validateQuery({ page: '1', limit: '101' });

    expect(errors).toEqual([
      expect.objectContaining({
        property: 'limit',
        constraints: expect.objectContaining({
          max: expect.any(String),
        }),
      }),
    ]);
  });

  it('rejects non-integer values', async () => {
    const errors = await validateQuery({ page: '1.5', limit: '20' });

    expect(errors).toEqual([
      expect.objectContaining({
        property: 'page',
        constraints: expect.objectContaining({
          isInt: expect.any(String),
        }),
      }),
    ]);
  });
});

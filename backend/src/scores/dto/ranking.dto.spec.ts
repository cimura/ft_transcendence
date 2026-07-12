import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RankingQueryDto } from './ranking.dto';

const validateQuery = (query: Record<string, unknown>) =>
  validate(plainToInstance(RankingQueryDto, query));

describe('RankingQueryDto', () => {
  it('accepts empty query params so controller defaults can be used', async () => {
    await expect(validateQuery({})).resolves.toHaveLength(0);
  });

  it('accepts limit within the allowed range', async () => {
    await expect(validateQuery({ limit: '20' })).resolves.toHaveLength(0);
  });

  it('rejects limit outside the allowed range', async () => {
    const errors = await validateQuery({ limit: '101' });

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
    const errors = await validateQuery({ limit: '1.5' });

    expect(errors).toEqual([
      expect.objectContaining({
        property: 'limit',
        constraints: expect.objectContaining({
          isInt: expect.any(String),
        }),
      }),
    ]);
  });
});

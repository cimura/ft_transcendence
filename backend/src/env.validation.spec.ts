import 'reflect-metadata';
import { validate } from './env.validation';

describe('environment validation', () => {
  const validSecret = 'a'.repeat(32);

  it('accepts a secret with at least 32 non-whitespace characters', () => {
    expect(
      validate({
        JWT_SECRET: validSecret,
        JWT_EXPIRES_IN: '1d',
        NODE_ENV: 'production',
      }).JWT_SECRET,
    ).toBe(validSecret);
  });

  it.each([' '.repeat(32), ` ${'a'.repeat(31)} `])(
    'rejects blank or short secrets after trimming',
    (JWT_SECRET) => {
      expect(() =>
        validate({
          JWT_SECRET,
          JWT_EXPIRES_IN: '1d',
          NODE_ENV: 'production',
        }),
      ).toThrow();
    },
  );

  it('rejects a padded known placeholder in production', () => {
    expect(() =>
      validate({
        JWT_SECRET: ' your_jwt_secret_key_here ',
        JWT_EXPIRES_IN: '1d',
        NODE_ENV: 'production',
      }),
    ).toThrow();
  });

  it('returns the normalized secret', () => {
    expect(
      validate({
        JWT_SECRET: ` ${validSecret} `,
        JWT_EXPIRES_IN: '1d',
      }).JWT_SECRET,
    ).toBe(validSecret);
  });
});
